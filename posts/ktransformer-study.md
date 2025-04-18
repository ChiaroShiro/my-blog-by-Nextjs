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