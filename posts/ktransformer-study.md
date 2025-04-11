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