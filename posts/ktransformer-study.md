---
title: 'KTransformer学习笔记'
date: '2025-04-10'
tags: ['LLM', '笔记', 'AI']
---

# Task 0

总共配了五个不同的环境

- Windows11 + RTX3060：❌

> 按照 Document 配置的，但是因为 windows 环境存在很多问题，比如 triton 包只有 Linux 版本吗，需要去自行安装预编译的包并确认版本，最终用了两天时间成功 install 后尝试运行，一直显示缺失关键的 DLL

- Linux + A40 * 8：❌

> 按照 Document 配置的，但是因为没有 sudo 权限，编译时的 g++ 版本有问题

- Linux + V100：❌

> 按照 Document 配置的，一路都比较顺利，但是在 Chat 的时候发现报错。具体原因是 V100 是 Volta 架构的 GPU，flash_attention_2 包不支持这种架构。但其实在 issues 里有人讨论了这个问题，并且给出了一种修改代码的方法，但是我尝试复现了三次均失败，猜测是模型代码已经迭代升级过了，旧的方案大概不再起作用了。

- Linux 无显卡：❌

> 这个过程做的整体比较混乱，因为没有显卡的缘故我的 CUDA 版本有些问题，最后在 install 时 CUDA 报错找不到物理 GPU，或许可以通过修改代码来解决这个问题，但是当时没有去细究这个问题

- Linux + L4：✅

> 按照 Document 配置的，一路都很顺利，很快环境搭建完毕，install 完成，但是在 Chat 的时候出现了比较奇怪的现象，就是不论问什么东西，输出都是不断地在吐 "case:1" 这个字符串
一开始十分没有头绪，但是后来突然意识到这个字符串可能并不是模型生成的 tokens，因此在代码中加了一些调试信息，最后发现模型生成的 tokens 是正常的，说明模型运行的没有问题，但是代码的其他部分会一直输出 "case:1" 这个字符串
后来再进一步调试定位到是在调用 torch.cuda 的函数的时候输出的，因此可以大体确定要么是环境有问题，要么是 import 的包有问题。我先排查了一遍环境，把所有包的版本都确认了一遍，把可能有问题的包都重装了一遍，问题没有解决。大概率就是 import 进来的包有问题，在项目中全局搜索 "case:" 这个字符串，最后发现在一个第三方库 ktransformer/third_party/llamafile/iqk_mul_mat.inc 中发现有一句莫名其妙的 ``printf("case:%d",typeA);``，将其注释掉并重新 install 整个项目问题就解决了
怀疑是某个包的作者没把调试语句删干净

## $\text{Technique}$

> $\text{\color{red}{Brief}}$：替换模型里的层，把高强度运算的数据放在 GPU 里用 VRAM 计算，低强度的运算放在 CPU 里用 DRAM 算；支持通过 YAML 文件便捷定义替换规则。比较适合端侧化部署。

具体地说，主要是在 GPU 端用 ``Marlin`` 实现了对 GGUF 量化格式的计算，不用解量化到 FP16/32 再计算，并且将 MoE、Embed 这些模块放到了 CPU 上计算。同时又用了优化 MLA 算子之类的 trick 加速。

在接口上做得也比较好，在做好模型特异化配置以后能直接用 YAML 定义 Torch 层到 KTransformer 层的替换规则，扩展性相当不错。

官方表示可以做到 14G VRAM + 382G DRAM 跑满血 ``Deepseek-R1``，虽然这个配置要求还是远高于一般的个人设备配置，但是如果能进一步优化，跑一些稍小点的模型，很有希望实现广泛的端侧化部署。

更具体地：

- 把 ``Deepseek`` 里没有完全公开的 MLA 算子技术优化了下，优化了 CPU 计算能力和内存消耗。

- 用 GGUF 量化数据类型优化了 BF16 格式数据的存储，并且实现了一套能直接操作 GGUF 的内核。

- ``Marlin``: 更适配现代 GPU 架构，可以在 GPU 上计算 BF16 的低精度，操作 GGUF 量化数据。

- ``CPUInfer``: 把 MoE 层和 Embed 这些计算强度比较低的功能放到 CPU 里做，节省 VRAM。

- ``YAML`` 替换规则：先要有一个模型的配置文件处理对特定架构的配置。然后可以直接正则表达匹配 Torch 里面对层的路径，定制替换 KTransformer 层以及运行设备、参数、递归替换规则。还可以自己写自定义层模块。

#### 环境

基本包依赖可以参考 ``requirement``，运行 ``Llama2-7B-Chat`` 需要首先有这个模型，其次还需要 ``flashinfer`` 等处理长上下文的依赖。具体运行参数配置可以参考 Document。

对一个模型替换时需要有一个 .py 文件对结构配置，然后一个 YAML 对层做配置。

---

## $\text{Code}$

文件结构：

- ``ktransformers_ext``：主要是 CUDA 硬件加速、CPUInfer、Marlin 等功能的实现。

- ``models``：对各种模型架构的配置，比如 ``configure_llama.py``、``modeling_llama.py`` 就是对 Llama 架构的配置。

- ``operators``：各种算子层，替换时的层就从这里面选。

- ``optimize``：实现了一些具体运行的时候的上层函数。还实现了一些常见模型的 YAML 配置。

- ``utils``：一些杂项。但是也有一些比较重要的函数，比如预填充和逐字生成。

- ``server``：实现了一些对外接口。

- ``tests``：测试代码。

- ``website``：网站代码。

python 命令运行 ``local_chat.py`` 即可。

大体流程：

- 运行 ``local_chat.py`` 可以进入 chat 界面。chat 前会先提前 import 各个模型的配置然后根据具体参数选择是载入已有的模型配置还是自定义模型配置

- 进入 ``optimize.optimize.py`` 中的 ``optimize_and_load_gguf`` 函数，读取 YAML，生成具体配置，加载 GGUF，替换层模块，加载权重。总之进行一个大模型的设置。

- 比较关键的对层的替换是 ``optimize.optimize.py`` 里的 ``inject`` 的工作。它会递归遍历所有需要被替换的模块，然后字符串操作获取替换和被替换的模块，然后动态导入替换模块，再用 ``set_module`` 函数做替换。

- 随后重回 ``local_chat.py``，进入 Chat 模式，支持单行/多行以及文件输入。生成字的功能依靠 ``prefill_and_generate`` 函数。

- 进入 ``util.utils.py`` 里的 ``prefill_and_generate`` 函数，进行预填充和生成。先进行一些比较基本的设置，然后第一步是分块预填充，每次填充 ``chunk_prefill_size`` 大小的 tokens，然后调 ``chunk_prefill`` 运行填充；预填充完了之后先生成第一个 tokens，再进行一些设置以后直接循环生成 tokens。

#### 一些值得注意的事情：

- 可以根据 VRAM 的大小动态调整每次分块预填充的块大小。具体而言直接修改 ``chunk_prefill_size`` 即可

- 多 GPU 模式下需要指定每个 ``device`` 是具体哪个 GPU

----

# Task 1

### 几种常见的微调方法：

- 在模型中添加小层，参数规模比较小，用于微调，但是需要修改模型

- 在 prompt 里添加一些信息，不需要修改模型，但是感觉比较逊

- LoRA：在模型外添加另一个计算通路，把算出来的东西叠加然后 softmax

- 在模型的最后加一个层，然后把加的层算出来的和不加层算出来的叠加做 softmax

## YAML 读取和注入

- local_chat.py 的 local_chat 函数里 optimize_config_path 表示 YAML 位置，调用 optimize.py 里的 optimize_and_load_gguf 做具体处理

- 在 optimize.py 里处理了 YAML 之后调用了 gen_optimize_config 进一步处理，递归把所有具体的路径替换方法和参数放进 out_data 里

具体里面的内容大概如同下面这样：

```yaml
{
    '': {
        'class': 'default', 
        'key': '', 
        'kwargs': {
            'generate_device': 'cuda:0', 
            'prefill_device': 'cuda:0'
        }
    },
    'model': {
        'key': 'model', 
        'class': 'ktransformers.operators.models.KQwen2MoeModel', 
        'kwargs': {
            'per_layer_prefill_intput_threshold': 0
        }
    }, 
    'model.embed_tokens': {
        'key': 'token_embd', 
        'class': 'default', 
        'kwargs': {
            'generate_device': 'cpu', 
            'prefill_device': 'cpu'
        }
    },
    'model.layers': {
        'class': 'default', 
        'key': 'blk', 
        'kwargs': {
            'generate_device': 'cuda:0', 
            'prefill_device': 'cuda:0'
        }
    }, 
    'model.layers.0': {
        'class': 'default', 
        'key': 'blk.0', 
        'kwargs': {
            'generate_device': 'cuda:0', 
            'prefill_device': 'cuda:0'
        }
    }, 
    'model.layers.0.self_attn': {
        'key': 'blk.0.self_attn', 
        'class': 'default', 
        'kwargs': {
            'generate_device': 'cuda', 
            'prefill_device': 'cuda'
        }
    }, 
    'model.layers.0.self_attn.q_proj': {
        'key': 'blk.0.attn_q', 
        'class': 'ktransformers.operators.linear.KTransformersLinear', 'kwargs': {
            'generate_device': 'cuda', 
            'prefill_device': 'cuda', 
            'generate_op': 'KLinearMarlin', 
            'prefill_op': 'KLinearTorch'
        }
    }
}
```

- 处理完之后调用 inject 函数注入，过程以代码分析

```python
def inject(module, local_optimization_dict, model_config:AutoConfig ,gguf_loader:GGUFLoader, prefix=''):
    for name, child in module._modules.items():
        # torch 的子模块
        if child is not None:
            child_prefix = prefix + name
            if child_prefix in local_optimization_dict:
                inject_module_meta=local_optimization_dict[child_prefix]
                # 在从 YAML 中读取的数据中查询
                if inject_module_meta["class"] != "default":
                    import_path = inject_module_meta["class"].split(".")
                    # 把路径提取成 list
                    import_module_name = ".".join(import_path[:-1])
                    # 纯文件路径
                    gguf_loader.tensor_device_map[inject_module_meta["key"]] = inject_module_meta["kwargs"] if "kwargs" in inject_module_meta else dict()
                    # 存储各种参数
                    import_class_name = import_path[-1]
                    # 文件名
                    module_cls=getattr(__import__(import_module_name, fromlist=[""]), import_class_name)
                    # 通过纯文件路径动态引入文件
                    print(f"Injecting {child_prefix} as", import_module_name, ".", import_class_name)
                    inject_module=module_cls(key = inject_module_meta["key"], gguf_loader = gguf_loader, config = model_config, orig_module=child, **inject_module_meta["kwargs"])
                    # 类似实例化一下
                    set_module(module, name, inject_module)
                    # 在 utils 里，用 setattr 替换属性
                elif inject_module_meta["class"] == "default":
                    print(f"Injecting {child_prefix} as default")
                    gguf_loader.tensor_device_map[inject_module_meta["key"]] = inject_module_meta["kwargs"] if "kwargs" in inject_module_meta else dict()
                else:
                    raise Exception("inject_module_meta[\"class\"] must be \"default\" or a class path")
                child_prefix += "."
                child_optimization_dict = {k: v for k, v in local_optimization_dict.items() if k.startswith(child_prefix)}
                inject(child, child_optimization_dict, model_config, gguf_loader, child_prefix)
```

## GGUF 读取处理

> 名词解释：
\
GGUF 是量化存储格式，将高精度浮点数转换成低精度存储，在运行模型的时候还需要把低精度浮点数解量化成高精度形式。
GGML 是一个高效处理张量运行和模型推理的库，尤其对 CPU 形式做了优化，GGUF 文件格式就是实现用来方便 GGML 处理的格式。

util.custom_gguf.py 文件里具体的写了读取 GGUF 文件的方法

#### \_\_init\_\_

首先会尝试使用 safetensor 方法打开 gguf 路径，如果成功的话就直接结束了，否则会尝试使用 GGUF 方法打开

safetensor 方法写明在 util.custom_loader 文件里，似乎逻辑比较简单，值得注意的是里面会通过 safetensor 库里的 tensor.to() 函数完成对张量存储设备的转换

> 当你调用 .to(device) 时，如果目标设备与当前设备不同，底层会执行数据传输。对于大规模模型或数据，这个过程可能需要一定的时间，因此在实际编程中最好在初始化阶段就将相关张量移至目标设备，以避免在训练或推理过程中频繁的数据传输。

**有一个比较值得注意的地方**：

在 GGUF 方法处理的时候使用了内存映射读取整个 GGUF 文件

```python
self.file_data_map[file_name] = np.memmap(file_name, mode = 'r')
```

这里使用了 Numpy 里的 memmap 方法实现了内存映射，即可以访问大规模二进制文件但是又不需要放入内存中，感觉是后面可以使用的方法

同样的 python 里也原生支持了一个类似的东西是 mmap，功能有点类似

#### load_gguf

读取 GGUF 文件的配置，处理出来每个张量的存储偏移量和元数据，但是不涉及到具体加载张量

#### get_mmap_tensor

返回一个直接 \_\_init\_\_ 中存储到内存映射的 Numpy 数组

返回的还是内存映射

#### get_undequanted_tensor_and_ggml_type

把内存映射 numpy 数组转换成 pytorch 张量

值得注意的是因为 from_numpy 是共享内存的，所以这里的数据还是在内存映射中

#### load_gguf_tensor

加载权重的核心函数，会根据张量大小选择一次性加载还是分块加载

如果 device 是 cuda 则会调用 GGML_DEQUANTIZE_GPU 列表里的函数加载权重

如果 device 是 cpu 则会调用 GGML_DEQUANTIZE 列表里的函数加载权重，并且确保了内存映像会放进内存中

另外对 BF16 和 Llama 模型做了特殊处理

两个列表的函数实现也在这个文件里，但是看起来很二进制很底层东西不多

但是实际上似乎在这一步用出去的内存只有五六个 G 的样子，但是 process.memory_info() 显示用到三十多 G，不过不知道为啥 htop 指令看到内存使用量只要三四 G，有点诡异

后记了下这个函数核心部分运行完的内存使用量变化，后面的输出结果类似于


> 内存使用量（开始前）：34082.52 MB 
\
 内存使用量（结束后）：34122.02 MB
 \
 内存使用量差值：39.50 MB，累计内存差值：5560.43 MB


## 算子层

> cpuinfer_ext 是 KT 自己实现的一个 C++ 编写的 python 扩展库，在 ktransformer.ktransformer_ext.ext_bindings.cpp 中 561 行里具体定义了这个扩展，并用 CMake 构建。
\
大体上实现了几个比较重要的内容
\
CPUInfer - CPU 上的核心推理引擎类
linear - 线性层的加速实现
mlp - 多层感知机的加速实现
moe - MoE 的实现
kvcache - KV 缓存相关功能，用于优化注意力机制

注意到 Qwen 的 YAML 文件里面将 device 设成 cpu 的地方只有两个，一个是 embed_tokens 功能的 generate 和 prefill 都在 cpu 上，一个是 mlp.experts 替换成 operators.experts.KTransformersExperts 的地方时 generate 使用了 cpu。显然 embed_tokens 是不太重要的，所以主要看看 KTransformersExperts 这个 MoE 部分的代码。

其中在替换 KTransformersExperts 时通过 generate_op 参数指定了参数使用 KExpertsCPU 类，我们先分析这个。

首先注意到这个类继承自 KExpertsBase 类，这是个简单的虚类，里面只有一个 load_weights 函数值得说道一下。

- load_weights 函数首先定义了 6 个 None 变量，用来存储 MoE 里的三个重要的矩阵 门控矩阵、上投影矩阵、下投影矩阵。然后通过 gguf_loader 里的 load_gguf_tensor 那个核心函数加载权重，随后再获取了类型以后一起作为返回值返回。然后它还特化了一下对 Mixtral-8x7B-Instuct 的支持。

KExpertsCPU 类继承自 KExpertsBase 类，虽然他把 load_weights 重载了，但是再后面阅读 KTransformersExperts 时还是有用的。

#### KExpertsCPU 部分

- \_\_init\_\_

这个函数没什么值得说的，要注意的是里面将 KExpertsCPU.CPU_INFER （注意不是 self）设成了 CPUInfer 类型，初始参数用 Config().cpu_infer 传进去，这个参数是从 cfg 配置文件里读入的，Config 就是个处理 cfg 文件的类，然后 CPUInfer 是 operator.cpuinfer 文件里的 CPUInfer 类，这个文件前面大段地实现了另一个类，但是 CPUInfer 类非常简单，就是直接调用了外部 C++ 库 cpuinfer_ext 里的 CPUInfer。

- load_weights

这个函数大体架构和父类里的差不多，不过他也支持了 safetensors 的加载方式。

但是要注意的是在处理 GGUF 加载方式的时候不是通过 load_gguf_tensor 这个函数加载的，而是通过 get_mmap_tensor 这个方式加载的。对 Mixtral-8x7B-Instuct 的特化支持也是使用 get_mmap_tensor 支持的。处理完之后直接把 tensor 放到字典里返回了

- load

首先通过 load_weight 得到并取出三个 tensor。并随后通过 ctypes 库直接得到三个 tensor 的指针

然后通过 cpuinfer_ext 外部库实例化出来 MoE 部分。

然后是 warmup 的部分，好像是进行内存缓存优化？不是很懂。再然后就是给一个 tensor 赋成 0 值，也就是初始化一下。

- submit_for_one_decode

这个函数就是给三个张量赋值，从 VRAM copy 到了 DRAM 上，然后调用了 cpuinfer_ext 里的函数。

虽然不是很懂但是调用的函数的作用大概就是给 MoE 提交了一个异步计算前向任务的请求。

- sync_for_one_decode

这个函数是上个函数的第二步，等待 MoE 计算完成然后把结果从 CPU copy 到 GPU 上，返回结果。

- forward

计算前向的。

第一个分支官方注释说 unreachable，那就不管了。第二个分支上来先做了一个把张量迁移到 CPU 上的操作，然后也是提交了个 MoE 的异步计算，等待计算完成后把张量转移进 out_device 里制定的设备里

#### KTransformersExperts 部分

注意到 KTransformersExperts 这个类继承自两个类 BaseInjectedModule 和 KExpertsBase，我们先从这里分析。

- BaseInjectedModule 类的内容比较简单，通过 orig_module 参数记录把哪个模块替换掉了，然后存储了 prefill 和 generate 的 device 参数。然后重写了 \_\_setattr\_\_ 和 \_\_getattr\_\_ 函数，使得先在替换类中寻找属性，找不到再去被替换类里找，都不行再去父类里面找。然后里面还需要执行前向功能的 forward 和加载权重的 load。这部分在 KTE 类中被重载了，所以就简单过一下

- 在 load 中会调用 utils 里的 load_weights 函数，这个函数负责处理加载权重。load_weights 会递归地寻找并调用 load_cur_state_dict 做具体的加载过程，这个函数内支持 safetensor 和 gguf 两种方法，gguf 还是 调用的 load_gguf_tensor 函数完成的加载

- forward 直接用了被替换模型的前向函数

具体到 KTransformersExperts 类中

- \_\_init\_\_

直接根据 op 参数实例化了前面的类，在 Qwen 的 generate 里就是实例化了 KExpertsCPU 类存到了 self 里，其他的都是简单的存一下罢了

- load

self 里有个 mode 参数记录当前的状态，如果要 generate 就是 unload prefill、load generate，如果要 prefill 就 unload generate、load prefill，还有就是 unload 状态直接把俩全卸载了

这里的 unload 和 load 都是指调用 op 参数指定的前面的类，指导前面的类做这些工作。

- forward 

根据当前的状态选择用 prefill 还是 generate 的类，然后调用他们的 forward 做前向。

#### 对这部分做个 Conclusion 

KTransformersExperts 就是个顶层模块，负责根据模式调度使用 prefill 还是 generate 功能，而具体选择什么方式实现 prefill 和 generate 是由参数决定的，也就是 YAML 实现的

而具体操作层面，比如 KExpertsCPU 类中，做的事情就是根据功能和参数选择了张量加载的设备，实现了 “加载张量到 CPU，调用 cpuinfer_ext 里实现的 MoE 计算前向，将结果返回存放入 GPU 中” 这个过程。

这部分就是所需要重写的，似乎 KTransformerExperts 类不怎么需要动，因为只是个顶层的东西，但是肯定需要写一个自己的 KExpertsCPU 这样具体执行的类，在翻阅的时候就能观察到这个代码根据继承和调用外部库，层层叠叠地累得很高了，所以写得时候应该是要补充很多外部工具和外部库的知识的。

#### 详细分析下数据存储的设备变化

- 在 KExpertsCPU 的 load_weights 中，使用 gguf 读取张量会使用 get_mmap_tensor，此时返回的依旧是内存映射，数据一直在磁盘中。

- 在 KExpertsCPU 的 load 中，获取了内存映射以后，在进行此步获取内存指针时，会把内存映射懒加载到内存中

```python
gate_ptr = ctypes.addressof(
    ctypes.cast(self.gate.ctypes.data, ctypes.POINTER(ctypes.c_uint64)).contents
)
up_ptr = ctypes.addressof(
    ctypes.cast(self.up.ctypes.data, ctypes.POINTER(ctypes.c_uint64)).contents
)
down_ptr = ctypes.addressof(
    ctypes.cast(self.down.ctypes.data, ctypes.POINTER(ctypes.c_uint64)).contents
)
```

通过测速可以发现这几行的代码运行速度异常地慢

# Task 2

因为内存映射的管理是完全依靠操作系统进行的，我们用代码很难实现对内存映射的加载和卸载，所以这个具体还是做 C++ 层面的修改吧

**后面开始对 C++ 层面的代码做分析**

ktransformers_ext 文件夹里提供了 pybind 工具实现的，具体模块设置在顶级目录的 ext_binding.cpp 里，以 MoE 部分简单介绍一下，顺便学习一个 pybind 的用法：

```cpp
auto moe_module = m.def_submodule("moe");
py::class_<MOEConfig>(moe_module, "MOEConfig")
    .def(py::init([](int expert_num, int routed_expert_num, int hidden_size,
                        int intermediate_size, int stride, int group_min_len,
                        int group_max_len, intptr_t gate_proj,
                        intptr_t up_proj, intptr_t down_proj, int gate_type,
                        int up_type, int down_type, int hidden_type) {
        return MOEConfig(expert_num, routed_expert_num, hidden_size,
                            intermediate_size, stride, group_min_len,
                            group_max_len, (void *)gate_proj, (void *)up_proj,
                            (void *)down_proj, (ggml_type)gate_type,
                            (ggml_type)up_type, (ggml_type)down_type,
                            (ggml_type)hidden_type);
    }));
py::class_<MOE>(moe_module, "MOE")
    .def(py::init<MOEConfig>())
    .def("warm_up", &MOEBindings::WarmUpBindinds::cpuinfer_interface)
    .def("forward", &MOEBindings::ForwardBindings::cpuinfer_interface);
```

这里定义了 cpuinfer_ext 的子模块 moe，然后把类 MOEConfig 作为了库中的类，但是 MOEConfig 似乎只是一个打包参数的类，因为其构造函数里面用到 python 里没法提供的类型，所以在这儿用 lambda 手写了一个构造函数

下面把 MOE 类作为了库中的类，并把构造函数、warm_up 和 forward 作为了可调用函数，注意这里 warm_up 和 forward 并不是直接调用 MOE 类里的函数，而是调用了前面类里的函数，做了一个功能绑定。

这个功能绑定是给异步操作使用的，具体来说在处理计算任务，比如调用 forward 的时候不会立刻执行 forward 进行计算，而是会返回一个调用方法（pair）里面分别是调用他要用的函数（inner）以及参数。调用的时候需要把这些东西交给 CPUInfer，然后他来处理队列和异步等操作。

至于 inner 函数，就是接收一个 void* 参数包作为函数参数，然后把要调用的函数和它的参数交给 cpu_infer 里的 enqueue 函数处理。

比如 python 代码端的这一行代码可以看到，调用 forward 以后其实是把返回值作为结果传给了 cpu_infer 里的 submit 函数

```python
self.cpu_infer.submit(self.moe.forward(expert_ids.size(0), expert_ids.size(1), expert_ids.data_ptr(), weights.data_ptr(), input_tensor.data_ptr(), output.data_ptr()))
```

显然，我们得先分析 cpu_infer 这个类

## cpu_infer 类

这个类就是管理异步线程的类，backend 是 Backend 的实例化，似乎用于管理线程池之类的东西？task_queue 是管理异步进行的队列

- enqueue

inner 函数中最终调用的函数，会把一个 lambda 函数塞进 task_queue 中，这个 lambda 函数的作用就是执行参数里的函数

- submit

把在 pybind 中的 bind 类里返回的那个 pair 作为参数，实际作用调用 pair.first（就是那个 inner 函数），参数是 pair.second，注意在操作前会把之前为 nullptr 的 CPUInfer* 参数填充为 this

- sync

阻塞等待 task_q 里的任务全执行完

- submit_with_cuda_stream

在给指定的 cuda 流里塞一个 cpu 任务，要求在 cpu 任务执行结束以后才继续进行 cuda 流的其他任务

- sync_with_cuda_stream

在 cuda 流里塞一个阻塞等待 task_q 结束的任务

#### Backend 类

负责管理多线程的类。构造函数会创建 max_thread_num_ 个线程，每个线程都开始做 worker_thread 函数，同时给每个线程开一个记录状态的 ThreadStatus 类型变量

每个 ThreadStatus 里有三个变量，一个是 status，表示当前这个线程的状态，有 WAITING、WORKING、EXIT 三个状态，意思很显然。另外两个是 curr 和 end，表示在执行任务的时候，当前执行到第几个任务，执行到第几个任务结束。

每个线程都会不停的做 worker_thread 函数，这个函数的内容就是不停的读取自己的状态，如果是 WAITING 就会在和类似计网里 CSDA/MA 那些东西差不多，WORKING 结束一段时间内会忙监听，如果都忙就低功耗等待。如果自己状态是 WORKING 就启动 process_tasks 函数。如果是 EXIT 就退出。

do_work_stealing_job 是多线程任务的启动函数，这个函数会计算出要用几个线程完成给定的任务，每个线程分配到哪些任务，执行任务用具体哪个函数。在分配任务结束以后就给线程状态设置为 WORKING，然后哪些线程在做 worker_thread 的时候就会读到 WORKING 信号开始工作。同时当前进程也会开始工作，也就是执行 process_tasks 函数

process_tasks 函数是每个线程具体执行任务时要做的事情。前面会给每个线程钦定好三个要执行的任务函数，分别是 init_func_，compute_func_，finalize_func_，具体内容是传参决定的。

先执行一次 init_func_，结束前执行一次 finalize_func_，关键在 compute_func_ 这里。每个线程会用循环不停的执行自己被分配到的任务，在自己的任务都执行完之后会去搜索别的线程，如果别的线程还有没做完的任务就直接拿过来由自己做，就可以加速了。

在调用方面，Backend 是在 pybind 绑定的那些函数里的参数，比如 MOE 部分的 forward 函数最后一个参数就是 Backend，这个参数不是通过 pybind 从而从 python 传进来，而是在 CPUInfer 中的 enqueue 时用 invoke 把这个参数强行包进参数里。这或许也侧面说明这个 C++ 库里所有通过 pybind 绑定的 C++ 函数都会用到多线程？

#### task_queue

一个处理任务队列的类，有一个 queue 来存储任务函数，里面的元素都是 function<void()>，具体来说实现的很巧妙，因为 ext_binding 里那行绑定类里 inner 中塞进 enqueue 的都是 lambda 函数，这些 lambda 函数就一句话，就是按照给定的参数执行实际要执行的函数，所以这里所有的函数都被包装成了 void() 类型的函数。

这个类会开一个线程 worker，这个线程会不停的运行 processTasks。

processTasks 具体内容还是很简单的，每次在队列里有待处理任务的时候取任务出来执行。

总体的思路非常简单，但是因为涉及到多线程，所以用到了很多锁，另外在任务队列为空的时候，为了避免程序不停的轮询队列造成 cpu 资源浪费，就用了条件变量的方法在队列为空且没有退出信号的时候直接睡眠。

**现在终于彻底理解了 CPUInfer 部分在干啥了，下面来看 MOE 部分**

## MOE 类

首先从 ext_binding 部分引入一下，先看看 MOEConfig 的结构：

```
构造函数 (__init__):
它接受 14 个参数从 Python 传入：
expert_num: 专家数量 (int)
routed_expert_num: 每个 token 路由到的专家数量 (int)
hidden_size: 隐藏层大小 (int)
intermediate_size: 中间层大小 (int)
stride: 步长 (int)
group_min_len: 分组最小长度 (int)
group_max_len: 分组最大长度 (int)
gate_proj: 指向门控投影权重的内存地址 (在 Python 中通常表示为整数 intptr_t)
up_proj: 指向上投影权重的内存地址 (Python 整数)
down_proj: 指向下降投影权重的内存地址 (Python 整数)
gate_type: 门控投影的数据类型 (表示 ggml_type 的 Python 整数)
up_type: 上投影的数据类型 (Python 整数)
down_type: 下降投影的数据类型 (Python 整数)
hidden_type: 隐藏层的数据类型 (Python 整数)
```

MOE 类构造函数就接受一个 MOEConfig 作为参数，然后向外暴露了 warm_up 和 forward 两个函数。

----

- 构造函数

MOE 的构造函数中就是在做无聊的填充数据、计算内存使用。这里面将每个类内变量需要的空间做了计算并求和，类内变量里 s 开头的比如 s_up_output_、s_mem_requests 这些都是 forward_one 中对一个 token 进行前向存储的变量。m 开头的比如 m_gate_input_、m_mem_requests 是批量 tokens 前向时使用的。

s_mem_requests、m_mem_requests 对这两个 vector 里记录了单个和批量前向时需要的总缓冲区的大小，以及每个缓冲区各自需要的大小以及指针。这俩计算完后会调用 shared_mem_buffer 函数来具体申请空间，并且把申请出来的总空间分配个各个缓冲区。比较值得注意的是因为同一时刻最多只需要计算单个、批量中的其中前向类型，所以这个内存是共享的，先来后到直接覆盖使用，大幅节省了内存。

- 预热 warm_up

对一些没用的东西做了单 token 前向，让一些内存在计算前能提前加载进缓存里。

- 三种前向

总体来说似乎没什么特别的，都是在做数据填充、矩阵计算这些东西，具体的写法是把执行的代码写进 lambda 里塞进 Backend 里并发计算。

**比较意外的是这里面没有设计到路由选择的内容**，所以再仔细会看一下 python 端的代码可以发现，准确地说：KExpertsCPU 做的内容，也就是 C++ 端 MOE 的部分，其实是在路由层计算完成已经筛选出要用的专家层以后做的具体计算部分。

而路由选择的部分在 KExpertCPU 的上一层 KTransformersExperts 的再上一层 KQwen2MoeSparseMoeBlock 中完成的，YAML 里的替换规则是：

```yaml
- match:
    name: "^model\\.layers\\..*\\.mlp$"
    class: ktransformers.models.modeling_qwen2_moe.Qwen2MoeSparseMoeBlock
  replace:
    class: ktransformers.operators.experts.KQwen2MoeSparseMoeBlock     # mlp module with custom forward function
    kwargs:
      generate_device: "cuda"
      prefill_device: "cuda"
```

这部分放进 cuda 里看起来很合理。

这个类具体内容就不分析了，总而言之这一层计算出路由门控张量以后会喂给 KExpertsCPU 里，也就是 forward 函数的 expert_ids 参数张量。具体打印一下这个张量可以看到内容大概是类似于这样子的 $20\times 8$ 的矩阵：

```
expert_ids.size() = torch.Size([20, 8])
>>> expert_ids: tensor([[58, 57, 62, 63, 26, 23,  2, 16],
        [35, 60, 45, 63, 54, 49, 55, 56],
        [52, 45, 63, 62, 56, 23, 50,  1],
        [18, 45, 35, 59,  4, 63, 49, 37],
        [45, 35, 63, 40, 58, 50, 55, 56],
        [45, 19, 18, 63, 62,  4, 23, 40],
        [35, 62, 58, 50, 56, 63, 49, 23],
        [35,  4, 45, 62, 63, 50, 51, 56],
        [53, 61, 52, 59, 63, 62, 23, 15],
        [52, 61, 59, 18, 63, 62, 23, 49],
        [52, 61, 53, 49, 50, 48, 58, 63],
        [35, 18, 60, 59, 58, 55, 48, 24],
        [35, 45,  4, 63, 40, 29, 16, 27],
        [61, 52, 53, 19, 63, 49, 62,  6],
        [60, 35, 50, 41, 47, 55, 42, 56],
        [52, 59, 18, 35, 11, 61, 53,  4],
        [53, 61, 52, 11, 45, 63, 62, 26],
        [35,  4, 45, 18, 59, 63, 58, 47],
        [35,  4, 45, 52, 63, 62,  5,  3],
        [53, 61, 52, 63, 48,  0,  1,  3]])
```

注意到值域不超过 64，拷打 GPT 后可以得知（网上似乎没找到相关信息），Qwen2-57B-A14B-Instruct 专家部分的结构是：

- 8 个共享专家（Shared Experts），它们始终被激活，用于捕获跨场景的通用知识；

- 8 个路由专用专家（Routed Experts），由路由网络从 64 个候选专家中根据概率选出，用于捕获细粒度、上下文相关的信息。

上面矩阵信息大概就是：批量处理 20 个 tokens，每个 token 激活 8 个专家，编号分别是里面的值

回看 MOE::forward 这个函数，在参数中 ``int qlen, int k, const uint64_t* expert_ids`` 这三项就是专家层选择的参数，qlen 是批量计算的 tokens 个数，k 是激活的专家数（也就是8），后面的数组就是每个 token 的专家选择。

## 修改日志

ktransoformers_ext 中加一个 debug 目录，里面放了个 debug.h 和 debug.cpp，封装 debug_printf 像 printf 那样直接往日志文件里输出

util/debug_utils.py 也加了个 debug 调试输出的东西

记得需要改 CMake 文件，要不然编译完也运行不了

用这个 debug 可以发现这个 Qwen2 会用 SharedMemBuffer::alloc 开 4G 的内存用来临时存储

```
UPDATE BUFFER SIZE: 0 -> 420656
UPDATE BUFFER SIZE: 420656 -> 497729536
```

为了方便，我们直接禁用 forward_many 函数，全部用 forward_one 来前向，实测可以发现速度只有原来的一半

先梳理下我们要怎么做，简单来说就三步：

- 先找到 MoE 部分的张量存放的具体外存地址

- 写一个自动管理内存的后台，支持动态加载一个专家以及卸载所有专家（后面或许可以优化这个形式）

- 把原本的直接内存找偏移变成直接从后台获取指针

第一步先找到专家张量的外存地址，custom_gguf.py 里处理这一部分

具体来说 \_\_init\_\_ 遍历文件，load 加载文件 ``file_data_map`` 以文件名为索引存放内存映射

```python
self.file_data_map[file_name] = np.memmap(file_name, mode = 'r')
```

``tensor_file_map`` 存放每一个张量所在的文件名

```python
for name in tensor_info:
    self.tensor_file_map[name] = f.name
```

``self.tensor_info[name]["offset"] = offset`` 存储了以 name 为名的张量在文件中的偏移

在 python 端 custom_gguf.py 中新增 get_tensor_file 函数获取张量所在的文件，get_tensor_offset 获取这个张量在这个文件里的偏移

MOEConfig 中添加了文件名和偏移量六个变量，同时加了个开关 use_external_proj，其为 0 表示用之前的正常内存访问。

MOEConfig 添加了一个新的构造函数并用 pybind 绑定到了 python 库中

---

实现一个 memback，构造时获取 GGUF 的文件地址和 MoE 张量偏移，还有其他 Config 信息，开一个全部专家个数大小的 vector，记录每个专家有没有被加载，被加载的话 gate、up 和 down 的内存指针在哪儿

- load 

参数是专家 ID，表示加载第几个专家。然后通过构造的时候获取的 config 获得 GGUF 文件里的偏移量、这个张量的长度。然后 fread 进 malloc 出来的内存里

- unload

参数是专家 ID，表示卸载第几个专家。然后直接 free 掉三个矩阵

- getGate / getUp / getDown

直接通过 vector 获取张量

前向时只使用 forward_one 函数，每次前向一次时直接将需要的 8 个专家全部加载进内存，然后按照正常操作计算，结束以后卸载掉。

此外一些小问题：

moe.h 和 memback.h 有循环引用问题，于是把 MOEConfig 类单独拉出来形成一个文件了

warm_up 没有意义了，直接强制设成 False 就行

并行的时候怕同一时刻若干线程打开同一个文件有问题，所以给 ExpertMemoryManager 上了锁

原来的正常内存映射读取方法也保留着，只要 use_external_proj 是 0 就用原版操作

怕内存泄漏直接上智能指针了

---

### 原版

加载完且完成一次 Chat 以后 
smem 查看：

```
PID     User        Swap    USS     PSS     RSS
3011662 chiarolrg   0       34.9G   34.9G   34.9G
```

htop 查看：

```
VIRT    RES     SHR 
51.2G   35.7G   33.5G
```

速度查看（启动 warm_up）：

```
prompt eval rate:     16.848145086227774 tokens/s
eval rate:            8.266528773237749 tokens/s

prompt eval rate:     21.9350247355175 tokens/s
eval rate:            9.424327205959687 tokens/s
```

### 成功新增换入换出功能

新增了专家换入和换出的功能，每次 MoE 计算都是通过专家换入换出计算。

加载完且完成一次 Chat 以后 
smem 查看：

```
PID     User        Swap    USS     PSS     RSS
3015239 chiarolrg   0       7.1G    7.1G    7.1G
```

htop 查看：

```
VIRT    RES     SHR 
51.2G   7319M   5120M
```

速度查看：

```
prompt eval rate:     0.2048723422113326 tokens/s
eval rate:            0.2535612539102516 tokens/s

prompt eval rate:     0.4506165881142956 tokens/s
eval rate:            0.45858982976645546 tokens/s
```

可以看到内存显著减少（从 $35G \rightarrow 7G$）

但是也可以注意到时间显著变慢。运行时可以观察到 12 个 CPU 没有都跑满，原版 KTransformers 推理的时候所有 CPU 都会跑满。在内外存加载卸载的时候通过锁保证同一时刻只能运行一个 load 或者 unload，这里应该可以优化一下。

#### 自行实现一个简单并行化换入换出

将换入换出并行化，将 memback.cpp 部分的锁从整个类共用一个锁（同一时刻只能对一个专家进行操作）变成一个专家拥有一个锁（一个专家同时只能进行一个操作，但是好几个专家可以同时被操作）

然后在 moe.cpp 中加载时通过并行化进行

内存消耗几乎无变化，速度测试如下：

```
prompt eval rate:     1.439952783879413 tokens/s
eval rate:            1.5702559443399726 tokens/s

prompt eval rate:     1.3583437527005409 tokens/s
eval rate:            1.5696250560580014 tokens/s

prompt eval rate:     1.2436954579780377 tokens/s
eval rate:            1.2999822671281258 tokens/s
```

速度大概提升了三倍

但是在某次运行中，在正常回答了两次问题或突然开始以如下的方式输出tokens了，具体来说就是一个字一个字地往外蹦，而且每两个字间还都要输出一个空格 token，不知道我是模型的问题还是我代码的问题：

```
real content:  阿里巴巴集团是一家中国 multinational consumer conglomerate 集团，其业务涵盖了电商、金融、物流、云计算等多个领域。阿里巴巴集团的旗舰平台是全球最大的B2B电商平台阿里巴巴，以及全球最大的零售平台淘宝网和中国领先的电商平台天猫。 阿里巴巴 集团还在数字娱乐、智能物流、人工智能等方面进行了布局和探索。

阿里巴巴集团的 成功 可 以 归 因 于 多 个 因 素 。 以下 是 其 中 一些 关 �键 因 素 ：

1. **  平 台 优 势  **  阿 里 巴 巴 集 团 的 旗 舰 平 台 阿 里 巴 巴 、 淘 宝 网 和 天 猫 均 为 世 界 上 最 大 的 电 商 平 台 之 一 ， 这 为 阿 里 巴 巴 �集团 的 业 务 发 展 和 吸 引 新 客 户 提 供 了 强 大 的 支 持 。  这 些 平 台 不 仅 为 用 户 提 供 了 丰 富 多 样 的 产 品 和 服 务 ， 而 且 还 通 过 互 联 网 技 术 实 现 了 跨 地 区 、 跨 时 间 的 交 易 ， 极 大 地 方 便 了 用 户 的 购 物 需 求 。
```

不过又提问几次之后又正常了，莫名其妙的

这个速度感觉还是不行啊，想了几个或许可以加速的办法：

- 在 backend 里封装 memback 的调用，然后加载卸载的 thread 共用 backend 里的 thread，减少 thread 构造和析构的时间

- 用 LRU 队列之类的方法减少重复的专家加载卸载

- 在构造专家加载卸载器的时候提前开好若干块内存区（比如这里是8块），然后每次只需要往里面 fread 就行，省去 molloc 和 free 的时间

- 在磁盘读写上是否会有点优化空间？比如多加点线程同时 fread 一块张量，或者限制同时 fread 的个数给磁盘减压？感觉或许有研究空间？

#### 改成 Backend 中的并行化方法

Backend 中有一个可行的并行化方法库，所以考虑把之前手写的多线程并行加载卸载改成调这个库来做。这样避免了线程构造析构的开销、而且那个库实现的确实也高效，同时还能让代码封装性好点。

修改后内存使用无变化

速度上又有比较大的进步：

```
prompt eval rate:     3.008859700435299 tokens/s
eval rate:            2.9686084378412754 tokens/s

prompt eval rate:     3.3411738888774978 tokens/s
eval rate:            3.2430363067779115 tokens/s

prompt eval rate:     3.302458554944471 tokens/s
eval rate:            3.043912623251746 tokens/s
```

#### 预先开好内存池

之前都是每次加载的时候 malloc 出来一块空间，free 的时候释放掉若干块空间，显然这里是有一点优化空间的。

所以改成每次构造的时候 malloc 出来 8（根据 MoE 层的 Config 定的）块大内存，然后每次 load 的时候选一块没有用到的内存直接往里面 fread 即可，unload 就也不用 free 了。

为了能线程安全所以用了原子操作。

但是修改完之后跑发现代码预加载完还没开始 Chat 的时候还是之前的 6.8 G内存使用，但是开始聊天以后内存就变得比之前大了：

smem 查看：

```
PID     User        Swap    USS     PSS     RSS
3015239 chiarolrg   0       10.5G   10.5G   10.5G
```

htop 查看：

```
VIRT    RES     SHR 
54.8G   10.7G   5122M
```

速度有提升，但是不大：

```
prompt eval rate:     3.0888130395315176 tokens/s
eval rate:            3.219521580983871 tokens/s

prompt eval rate:     3.4773272076176 tokens/s
eval rate:            3.3156641393729083 tokens/s

prompt eval rate:     3.436628358791843 tokens/s
eval rate:            3.327761913908967 tokens/s
```

这个内存的增加很奇怪，但是仔细研究一下可以发现，这个模型的 MoE 部分好像总共是 29,864,755,200 字节，也就是 27.8G，如果从之前原版大概要用 35G 内存反推的话，其他部分大概是占用 7G 内存（虽然从加载的张量看好像只用到 4.6G，总张量 32.45G），而如果只加载八分之一的 MoE 张量的话，就是 3.5G，那现在这个新版本使用 $3.5G+7G=10.5G$ 似乎才是合理的，上一个 watch smem 只用了 7.2G 的才是不合理的，或许是因为 watch 的取样间隔太大，malloc free 太快所以检测不到？

后更：傻了傻了，忘记了这个模型还有层这回事儿了，我用的这个 Qwen2 模型是 28 层，每层都有一个 MoE，所以说原来的方法里每次用完就 free，那内存里同一时刻只会保留一个层的 MoE 里的 8 个专家，所以使用的内存量就是 $27.8\div 28\div 8$，那自然是小的可以忽略。新的方法对于每一层都可持久化地维护8个专家的内存，所以内存使用量是 $27.8\div 8$，那自然就不会太小了

---

#### LRU 队列优化

一开始把 LRU 队列和之前的 memback 放在一起了，结果感觉逻辑非常的灾难，而且编译完了以后一直有段错误，用 GDB 调也很难调，毕竟段错误的地方是用内存运算的地方，但显然真正错误的地方是分配内存的地方，那个地方的代码没法用GDB定位出来。总之越改越发向💩山靠拢，最后还是选择了重构

分离出来了一个 lru_queue 文件，定义了 LRUQueue 类。

构造函数接受已经 malloc 好的若干个内存指针，然后用 deque 维护 LRU 队列。外部调用 update 就可以塞进去一个专家，如果这个专家已经在 LRU 里了就返回 true 并把那个专家提前，否则返回 false 淘汰最后一个专家并把这个专家塞进头上。调用 find 可以找到专家被分配到的内存地址

编译一次整个项目用的时间太长了，我也不会改 CMake 的文件，所以为了提高效率每次构造函数的时候都是直接输入 LRU 的长度

不过后来仔细思考了一下感觉这么分离出来的 lru_queue 还是挺丑的，毕竟构造函数还要依赖外部 malloc 出来的若干内存指针，如果把 malloc 分配内存也塞进 lru_queue 代码里可能更漂亮也更合理一点，不过这都是代码强迫症的表现罢了，也懒得改了（）

LRU 队列长度8：

内存使用约 10.5G

```
prompt eval rate:     0.4648808194463254 tokens/s
eval rate:            2.943284536005187 tokens/s

prompt eval rate:     3.5337905816947797 tokens/s
eval rate:            3.424662772347339 tokens/s

prompt eval rate:     3.571142376219993 tokens/s
eval rate:            3.3501748696234857 tokens/s

prompt eval rate:     3.5989137603835033 tokens/s
eval rate:            3.3808290421320666 tokens/s
```

可以看到基本没啥大优化，就是 0.1 级别的速度提升

LRU 队列长度16：

内存使用约 14.5G

```
prompt eval rate:     0.7649324045078721 tokens/s
eval rate:            3.4449987960454242 tokens/s

prompt eval rate:     3.679449802673237 tokens/s
eval rate:            3.530064438090309 tokens/s

prompt eval rate:     3.498072196511689 tokens/s
eval rate:            3.430295990678646 tokens/s

prompt eval rate:     3.7813565271392133 tokens/s
eval rate:            3.5318900029281006 tokens/s
```

可以看到如果 LRU 长度是 16 的话优化只是约 0.2 的速度提升，感觉意义不大啊

LRU 队列长度24：

内存使用约 17.4G

```
prompt eval rate:     2.9083307891076973 tokens/s
eval rate:            3.489394899471302 tokens/s

prompt eval rate:     3.979099159007868 tokens/s
eval rate:            3.6936318182349086 tokens/s

prompt eval rate:     3.774848543167508 tokens/s
eval rate:            3.789872399936608 tokens/s

prompt eval rate:     4.007809679994855 tokens/s
eval rate:            3.7275507490358937 tokens/s
```

有大概 0.4~0.5 的提升吧

LRU 队列长度32：

内存使用约 20.9G

```
prompt eval rate:     1.9930695427083887 tokens/s
eval rate:            1.6505873000069324 tokens/s

prompt eval rate:     3.214201277748913 tokens/s
eval rate:            3.6216638336115246 tokens/s

prompt eval rate:     4.314659157128542 tokens/s
eval rate:            3.9761018496529164 tokens/s

prompt eval rate:     4.159040741267019 tokens/s
eval rate:            4.061820329863963 tokens/s

prompt eval rate:     4.381198052999627 tokens/s
eval rate:            4.051997287966979 tokens/s
```

比较奇怪的是前三次 Chat 的速度都很低，而且CPU也没有跑满，几个核都在 60~90% 利用率间波动，莫名其妙的。大概三次 Chat 以后才会持续以 100% 利用率运行，并且速度能达到 4.0 tokens每秒差不多。有时候重跑又会在第一次比较慢的 Chat 之后立马以全速进行，或许是操作系统的问题

LRU 队列长度64：

内存使用约 34.8G

```
prompt eval rate:     1.0919516425741305 tokens/s
eval rate:            4.957079722242606 tokens/s

prompt eval rate:     10.145701451596127 tokens/s
eval rate:            8.604020100407359 tokens/s

prompt eval rate:     10.140888892010251 tokens/s
eval rate:            9.139443438648305 tokens/s

prompt eval rate:     10.504749836460315 tokens/s
eval rate:            9.115173304575666 tokens/s
```

开到 64 除了一开始以外就没有外存读写这一说了，可以看到除了第一次对话缺少 warm_up 所以比较慢，后面已经能达到原始模型 forward_one 的速度了，内存使用上也和原始模型没区别

毕竟路由层给每个专家分配的概率比较平均，很显然这个 LRU 的长度和速度提升不是线性关系，其实这么想的话感觉这个 LRU 优化相当没必要，毕竟这个 LRU 长度最大基本也就是 16 左右了，再大内存就相当吃不消了，但是速度只有零点几的提升，内存多了好几个 G，纯纯负优化啊

---

### 流水线读写内存

#### 分析下架构

计组期中给我学魔怔了，发现咱想实现的这个功能和 CPU 流水线有些相似，那就叫流水线了

之前研究的代码都是单个 MoE，且都取好 top-k 个专家的情况下的代码，下面先来看看整个模型的结构吧。当然是只关注 MoE 的部分

首先显示 Qwen2 的原始代码（ktransformers.models.modeling_qwen2_moe.py）中，看起来这个文件是 KT 团队在 Qwen 团队原代码上改出来的

在一开始的时候（也就是 local_chat.py 中）调用 Qwen2MoeForCausalLM 模块完成初始化

```python
custom_models = {
    "DeepseekV2ForCausalLM": DeepseekV2ForCausalLM,
    "DeepseekV3ForCausalLM": DeepseekV3ForCausalLM,
    "Qwen2MoeForCausalLM": Qwen2MoeForCausalLM,
    "LlamaForCausalLM": LlamaForCausalLM,
    "MixtralForCausalLM": MixtralForCausalLM,
}

...

model = custom_models[config.architectures[0]](config)
```

---

在 Qwen2MoeForCausalLM 这个模块中会执行

```python
self.model = Qwen2MoeModel(config)
```

从而初始化出来 MoE 模型部分

---

在 Qwen2MoeModel 中可以看到 

```python
self.layers = nn.ModuleList(
    [Qwen2MoeDecoderLayer(config, layer_idx) for layer_idx in range(config.num_hidden_layers)]
)
```

根据调试可以得到 num_hidden_layers 就是 MoE 的总层数 28，Qwen2MoeDecoderLayer 就是生成每一层 MoE 部分的模块

---

在 Qwen2MoeDecoderLayer 中可以看到他根绝条件生成了 Sparse MoE 和 Dense MoE

```python
if (layer_idx not in config.mlp_only_layers) and (
    config.num_experts > 0 and (layer_idx + 1) % config.decoder_sparse_step == 0
):
    self.mlp = Qwen2MoeSparseMoeBlock(config)
else:
    self.mlp = Qwen2MoeMLP(config, intermediate_size=config.intermediate_size)
```

调试实测 decoder_sparse_step 为 1，这一步生成的所有 MoE 都是 Sparse MoE

---

在 Qwen2MoeSparseMoeBlock 中可以看到有

```python
self.experts = nn.ModuleList(
    [Qwen2MoeMLP(config, intermediate_size=config.moe_intermediate_size) for _ in range(self.num_experts)]
)
```

这里面的 num_experts 调试得到就是 64，也就是 Experts 的个数

---

至于 Qwen2MoeMLP 模块就很简单了，这次直接贴出完整代码

```python
class Qwen2MoeMLP(nn.Module):
    def __init__(self, config, intermediate_size=None):
        super().__init__()
        self.config = config
        self.hidden_size = config.hidden_size
        self.intermediate_size = intermediate_size
        self.gate_proj = nn.Linear(self.hidden_size, self.intermediate_size, bias=False)
        self.up_proj = nn.Linear(self.hidden_size, self.intermediate_size, bias=False)
        self.down_proj = nn.Linear(self.intermediate_size, self.hidden_size, bias=False)
        self.act_fn = ACT2FN[config.hidden_act]

    def forward(self, x):
        return self.down_proj(self.act_fn(self.gate_proj(x)) * self.up_proj(x))
```

可以看到大概就是一个最简单的 MLP 层，没有什么多余的东西

---

至此我们整理一下这个 Qwen2 原始模型的大体结构

```
Qwen2MoeForCausalLM .    model   <=  Qwen2MoeModel
Qwen2MoeModel .          layers  <=  Qwen2MoeDecoderLayer * 28
Qwen2MoeDecoderLayer .   mlp     <=  Qwen2MoeSparseMoeBlock
Qwen2MoeSparseMoeBlock . experts <=  Qwen2MoeMLP * 64
Qwen2MoeMLP                      <=  Trivial MLP
```

现在我们回来看看我们针对 Qwen2 的 YAML 配置，主要是下面这几句比较关键：

```yaml
- match:
    name: "^model\\.layers\\..*\\.mlp$"
    class: ktransformers.models.modeling_qwen2_moe.Qwen2MoeSparseMoeBlock
  replace:
    class: ktransformers.operators.experts.KQwen2MoeSparseMoeBlock     # mlp module with custom forward function
    kwargs:
      generate_device: "cuda"
      prefill_device: "cuda"
- match:
    name: "^model\\.layers\\..*\\.mlp\\.experts$"
  replace:
    class: ktransformers.operators.experts.KTransformersExperts     # custom MoE Kernel with expert paralleism
    # device: "cpu"   # which devices to load this module when initializing
    kwargs:
      prefill_device: "cuda"
      prefill_op: "KExpertsTorch"
      generate_device: "cpu"
      generate_op:  "KExpertsCPU"
      out_device: "cuda"
  recursive: False # don't recursively inject submodules of this module
- match:
    name: "^model$"
  replace:
    class: "ktransformers.operators.models.KQwen2MoeModel"
    kwargs:
      per_layer_prefill_intput_threshold: 0 # 0 is close layer wise prefill
```

感觉直到现在才能比较清晰地解读出来这个 YAML 的意思了：

最顶层的 ``Qwen2MoeForCausalLM.model`` 也就是 ``Qwen2MoeModel`` 换成了 ``KQwen2MoeModel`` 模块

``Qwen2MoeForCausalLM.model.layers.mlp`` 也就是 ``Qwen2MoeSparseMoeBlock`` 换成了 ``KQwen2MoeSparseMoeBlock``

``Qwen2MoeForCausalLM.model.layers.mlp.experts`` 也就是 64 个 ``Qwen2MoeMLP`` 换成了 ``KTransformersExperts``

所以新的 KT 架构 Qwen2 模型是

```
Qwen2MoeForCausalLM .     model   <=  KQwen2MoeModel
KQwen2MoeModel .          layers  <=  Qwen2MoeDecoderLayer * 28
Qwen2MoeDecoderLayer .    mlp     <=  KQwen2MoeSparseMoeBlock
KQwen2MoeSparseMoeBlock . experts <=  KTransformersExperts
KTransformersExperts              <=  KExpertsCPU + C++ Part
```

其中 KQwen2MoeSparseMoeBlock 部分做了路由、MoE和共享专家这些工作，KTransformersExperts 在获取了 top-k 之后只专注于高效的 CPU 并行计算

这么看的话在 KQwen2MoeModel 中实例化每一层的时候就得把层信息带进去，然后再想办法做流水线化的内存加载

---

#### 添加层信息记录器

我的构想大概是这么几步来实现这个流水线

- 首先显然得有个东西独立于代码的其他部分，时刻记录下目前处理到了哪一层，这样才能激活线程去读后面层的 MoE 信息。这东西就叫层信息记录器了

- 开几个线程池时刻监视着这个层信息记录器，如果现在在计算第 $i$ 层，就把 $i+1$ 和 $i+2$ 层的 MoE 读取到内存里

- 再就是调参的工作了，提前几层读，用几个线程计算几个线程读，比例怎么分配都需要调参。另外在没算完前面层的信息的时候是没法知道这一层的 MoE 选那些专家的，所以只能一次性把整个MoE的所有专家全读进来，那能否有方法优化这一步呢

这东西确实比前面的东西难写太多了，毕竟涉及到的内容太多了，跨越了太多的模块，需要 python 和 C++ 同步很多东西。

先在C++开了个 moe_tracker，里面通过 static 操作保持永远只有一个层信息记录器 MoeTracker，并且为了能适配那些 MLP 和 MoE 层混用的模型，所以没有暴力地把所有层都加入层信息记录器里记录，而是通过外部调用注册函数的方法来添加层。简记下几个函数方法

- getInstance：获得唯一层信息记录器实例

- initialize：顾名思义，清空信息

- registerLayer：注册一个层，用名字识别

- getLayerCount：注册的层个数

- setCurrentLayer：更新目前在计算的层

- getCurrentLayer：查看目前在计算的层

- getLayerName：通过名字查注册的层ID

- getLayerIdByName：同上，反过来

所有函数全用lock_guard实现进程安全了。包装了一套外部函数供python端安全地使用

python端为了方便在 operators.moe_tracker 里又包装了一层

随后在 KQwen2MoeSparseMoeBlock 里重载了一遍构造函数，并在里面做了注册，在 KExpertsCPU 里给 C++ 端计算的时候附带了层信息

这部分虽然写得比较混乱但是好歹是能 work 的，但是更难的显然还是在后面的读取内存的线程池怎么写

---

换了新的服务器，新服配置也太牛了，实测模型速度能从原来的 3.3 tokens/s 变成 4.9 tokens/s。不过因为要考虑添加新的线程，于是测试了下线程个数对速度的影响，结果发现效果比较出乎意料。

之前的所有测试都是 10 个线程，但是如果到 15 线程速度并没有很多的提升，基本也不会达到 6 tokens/s，而如果开到 20 线程则会比原来更慢，甚至不如 10 线程，这是为什么呢？硬盘读写太密集会降速么？还是说占用的核太多，计算时容易被其他进程中断减速？不知道我猜的