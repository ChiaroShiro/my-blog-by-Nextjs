---
title: '端侧模型部署学习笔记'
date: '2025-08-26'
tags: ['LLM', '笔记', 'AI', '端侧']
pinned: false
---

# 三篇论文的调研

## T-MAN: Bridge Quantization Flexibility and NPU Specialization via Table Lookup for Low-Bit LLM Inference

讲的是把大模型部署到端侧的方法，并完全使用 NPU 计算，提到了很多之前不认识的概念和知识点，看得还挺艰难的

讲到 NPU 大多只支持对固定的几个量化类型有支持，所以如果量化的类型不对就没法直接用 NPU 计算，需要反量化。然而一般的 NPU 又没有针对反量化的实现，因此这就会大大拖慢速度，甚至导致负优化。

一般的反量化都是通过量化公式的逆推，通过几个平移缩放来实现，但是因为这个东西 NPU 不支持，所以为了加速，这里采用查表的方式。因为量化出来的值是很有限且离散的，所以直接对于每一个离散值都提前计算出它应当被反量化为几，然后具体做的时候直接查表就行。

这篇论文和后面那篇论文的算法核心都是 LUT，中文大概就是表查找，但是感觉说白了就是个高级数组罢了...

这种 LUT 就是简单的查表实现快速反量化，同时还有另外一种 LUT 的思想，就是说 prefill 阶段大多都是矩阵乘矩阵，decode 阶段大多是向量乘矩阵，而在向量乘矩阵的时候可以把向量的数值的二进制形式展开，展开成一个 01 矩阵，这样虽然看起来从 $O(n^2)$ 的向量矩阵乘变成 $O(n^3)$ 的矩阵矩阵乘，但是因为 01 矩阵的特性所以有十足的优化空间。

具体而言如果向量的长度是不长的，那么一行的 01 组合的可能是很少的，就可以通过预处理打表的方法提前算出所有的可能值，然后直接根据 01 位查找。

但是这样的话对于一次查找，我们的查找坐标是若干个值的第 $k$ 位的二进制组合在一起得到的数字，如果存储方式是常规的存储方法，就是每个数都用二进制一个一个的排在一起（也叫并行数据），那么我们需要的 bit 是非常分散的，我们需要每隔若干位取出一个 bit，然后把这些单独的 bit 组合成一个数字，尽管这些都可以通过快速的位运算解决，但是从性能上说是不合适的。

因此这里最好是用串行数据存储，也就是说 bit 排布的时候显示排放所有数字的最高位，然后排放所有数字的次高位，以此类推。不得不说挺神秘的。

所以为了高效地进行 decode 和 prefill，一种比较 trivial 的想法就是把参数存储两份，一个是串行一个是并行，一个用来 decode 一个用来 prefill，但是显然这是很难令人满意的。

所以基于这种考虑，这篇论文提出了两级 LUT 的方法，就是数据使用串行方式存放，针对 prefill 阶段，第一次 LUT 得到并行数据，然后第二次 LUT 得到反量化数据。

比如对于 4 个数据的 INT4 的存放，如果最高位是 0011，那么第一次查表得到 0000 0000 1000 1000，也就是最高位正确、其余位为 0 的 16bit 值，显然这样查四次得到所有 4 个位的值，然后位移取或就是正确值了，就可以进行后面的操作了。

另外在 prefill 和 decode 的时候，因此缓存有限，所以每次矩乘计算的时候只能一块一块地做，也就是 tiling 分块，矩乘时比较高效的方式是分成二维的片，而向量乘矩阵的时候高效的方法是一行一列地分，但是这里就不能同时满足这两个目标，因为这样会很占宝贵的缓存空间。

因此它采取的方法是把数据从内存运到缓存时采用最快的连续方法，而从缓存到寄存器的部分则不做要求，因为内存到缓存是效率瓶颈，所以只要提升它的速度就可以了，而因为多线程流水线的缘故后者慢一点无伤大雅。

讲道理关于 tiling 部分我也不是很懂，感觉太底层了，不对计组很熟悉且对计算的底层代码很熟悉的话，不是很能彻底理解。

## T-MAC: CPU Renaissance via Table Lookup for Low-Bit LLM Deployment on Edge

这篇论文的核心也是 LUT，和前面 T-MAN 另一个不同的是，上一篇是将模型部署到端侧并完全使用 NPU 计算，而这篇是致力于部署到通用 CPU 上。因此这个论文的关键不在于用 LUT 实现反量化，因为 CPU 做这个可以很快，但是相反它做矩阵计算就会很慢。因此这篇研究主要是用 LUT 直接做矩阵乘法，也就是把向量拆分成 01 矩阵。但是这种优化会导致两个问题，一个是前面也提到过的数据存放方式会导致性能的下降，另一个是 LUT 表本身太大了。

然后针对数据存放，它也是用了各种数据重排以及精心设计分块的方法来实现的，感觉十分地底层不是很懂啊...

针对表的体积的问题，因为矩乘里面 01 代表的实际值是 -1 和 1，所以 0011 所代表的 $-a_1-a_2+a_3+a_4$ 和 1100 所代表的 $a_1+a_2-a_3-a_4$ 是相反数，也就是可以将体积缩小一半了。

此外它还提到表量化，即对 LUT 表里的数值本身再做一次量化（比如从 FP16 量化到 INT8），这样表的每个条目占用的空间就变小了，可以进一步压缩表的体积。

## Scaling Up On-Device LLMs via Active-Weight Swapping Between DRAM and Flash

感觉前两篇似乎大篇幅都在讲很底层的东西，这一篇要比前两个更眼前一亮一点。

这篇论文提到上下文稀疏性，也就是说激活值（在模型中不断一层一层走的结果向量）中有很多 0 值，尤其是 ReLU 里 0 值更多，这些值代表的是神经元关闭，也就是说向量的这个值乘以矩阵的任何一行都是 0，而既然都是 0 了那这一行拿不拿出来、算不算都无所谓了。ReLU 会产生很多真 0，而对于现在更常用的其他激活函数比如 SiLU，它会产生很多极小值，针对这种情况这个论文里的方法是采用 Top-k 的方法，也就是说只激活大小位于前 k 名的激活值，其他值看作 0。

基于这种观察就可以提出一个类似 MoE 里部分激活的那种感觉的优化，也就是说根据前面的激活值，来预测后面几层我们需要拿出参数的哪些行进入内存并参与计算，哪些不需要。这样就可以大大减少内存消耗，动态调整预存的层数也就能根据内存大小自适应部署了。

这里为了加速也用了数据重排的思想，原始的参数里都是一层一层的排放，一层里面顺序排放每一个矩阵的参数，而它为了能一次取到多个层的一个矩阵，就会把参数存放改成一类矩阵一类矩阵的排放，一类矩阵内部按照层顺序排放。

可以想到这种方法对精度还是具有影响，为了降低影响它又提出自蒸馏的方法来训练这个算法，具体而言就是用没有上这个优化的原始模型来蒸馏这个算法，优化参数让它能准确率更高。

按照我的理解，蒸馏和训练的区别在于训练是不管过程如何，只要最后的输出是正确的就行，而蒸馏是指使小模型运算中完全按照大模型的思维来，每一层的激活值都要类似。

感觉似乎这几篇论文都很爱研究数据重排那些东西，对一些比较底层的 io 很关注，感觉这是我十分不了解的领域。

# mllm 项目调研

## Fast On-device LLM Inference with NPUs

只关注outlier的部分

对于常规的量化来说，大概就类似于对所有的值都整除一个 $s$，这个 $s$ 要满足对于参数中最大的 $x_{max}$ 有 $\frac{x_{max}}{s}=128$，对于参数中最小的 $x_{min}$ 有 $\frac{x_{min}}{s}=-127$ 或 $0$。

而如果激活值有 outlier 那么模型的精度就会下降，论文中注意到 outlier 出现的频率并不高，因此优化方法就是挑选出所有的 outlier 值，将他们放到 CPU 上计算，将得到的结果覆盖到 NPU 计算出来的结果上去，因为 outlier 应该是很少的，所以 NPU 的计算时间可以覆盖住 CPU 的 outlier 计算时间。

但是又注意到这样就代表着 CPU 上需要同步额外保存一份参数，这样就会使得内存中必须放置两份参数，这是代价很高的。因此论文中又注意到大多数的异常值都集中在几个通道上，比如某模型上 3% 的通道集中了 80% 的 outlier 分布，因此内存上只需要保存这些参数，如果有少量不在内存中的 outlier 就现读取进内存中去，这样的时间也是可以被 NPU 覆盖住的。

另外论文中还有一个注意是大多数的异常值并不重要，直接剪裁掉对结果的影响不大，这些 outlier 大多分布在模型的中间层，因此这个论文还会离线对模型中的所有会出现的 outlier 做判断，找到那些不重要的 outlier 然后去掉。

这种做法被称作 Shadow outlier execution

## 仓库代码

#### 关于v2分支

QNNTypeMacros.hpp负责一些最底层的接口对齐

QNNUtils负责一些和QNN相关的脏活累活，主要是解析.so文件和静态图那些东西

QNNBackend是核心，但是内容很少，目前只有前期工作，就是创建日志、设备啥的，以及注册算子什么的，关于执行的内容是一点没有

#### 关于main分支

QNN端专门用于INT8量化，支持的算子比CPU少很多，具体支持的列表在QNNBackend::registerOps中

具体列表如下

```cpp
void QNNBackend::registerOps() {
    addCreator(ADD, (QNNBackend::Creator *)new QNNAddCreator());
    addCreator(CAUSALMASK, (QNNBackend::Creator *)(new QNNCausalMaskCreator()));
    addCreator(MATMUL, (QNNBackend::Creator *)(new QNNMatmulCreator()));
    addCreator(RMSNORM, (QNNBackend::Creator *)(new QNNRMSNormCreator()));
    addCreator(LAYERNORM, (QNNBackend::Creator *)(new QNNLayerNormCreator()));
    addCreator(ROPE, (QNNBackend::Creator *)(new QNNRoPECreator()));
    addCreator(IROPE, (QNNBackend::Creator *)(new QNNIRoPECreator()));
    addCreator(SCALE, (QNNBackend::Creator *)(new QNNScaleCreator()));
    addCreator(SILU, (QNNBackend::Creator *)(new QNNSiLUCreator()));
    addCreator(SOFTMAX, (QNNBackend::Creator *)(new QNNSoftMaxCreator()));
    addCreator(LINEAR, (QNNBackend::Creator *)(new QNNLinearINT8Creator()));
    addCreator(LINEARINT8, (QNNBackend::Creator *)(new QNNLinearINT8Creator()));
    addCreator(MUL, (QNNBackend::Creator *)(new QNNMulCreator()));
    addCreator(VIEW, (QNNBackend::Creator *)(new QNNViewCreator()));
    addCreator(RELU, (QNNBackend::Creator *)(new QNNReLUCreator()));
    addCreator(OP_GELU, (QNNBackend::Creator *)(new QNNGELUCreator()));
    addCreator(QUANTIZE, (QNNBackend::Creator *)(new QNNQuantizeCreator()));
    addCreator(DEQUANTIZE, (QNNBackend::Creator *)(new QNNDequantizeCreator()));
    addCreator(MERGEOUTPUT, (QNNBackend::Creator *)(new QNNMergeOutputCreator()));
    addCreator(SPLITINPUT, (QNNBackend::Creator *)(new QNNSplitInputCreator()));
    addCreator(TRANSPOSE, (QNNBackend::Creator *)(new QNNTransposeCreator()));
    addCreator(SUPERSILU, (QNNBackend::Creator *)(new QNNSuperSiLUCreator()));
}
```

注意这里面的 LINEAR 和 LINEARINT8 被注册为了 QNNLinearINT8Creator。

同样要注意的是 CPUBackend.cpp 里面注册了更多的算子，但是只有一个是 INT8Shadow：

```cpp
    addCreator(LINEARINT8SHADOW, (CPUBackend::Creator *)(new CPULinearINT8ShadowCreator()));
```

src/models/qwen/modeling_qwen_npu.hpp 中实现了对上层的很多接口

- QWenModel_NPU 中的 489 行是调用 shadow 概念的入口，似乎在这里完成对 Shadow 还是非 Shadow 层的选择。可以看到他将选择的不同类似的层塞进了 modules 里，然后 Forward 中直接顺序遍历了这些层。

- QWenForCausalLM_NPU 是对上层的统一接口。里面的 model 来自于 QWenModel_NPU，并且 Forward 里的 output 直接来自于 ``auto outputs = model({x})[0];``

QWenModel_NPU 的 modules 具体选择的时候语法比较 modern，总而言之通过 std::apply 和一些模板技术使得非 shadow 情况下使用 QwenNPU_CPUDecoder 类， shadow 情况下使用 QwenNPU_CPUDecoderWithShadow 类

- QwenNPU_CPUDecoderWithShadow 类的 Forward 函数似乎比较有意思：

```cpp
   // CPU预处理
   auto x = input_layernorm(inputs[0]);           // RMSNorm层
   x = pre_attn_quantize(x);                      // 量化层
   
   // NPU执行第一部分（注意力机制）
   x = Tensor::toQNN({x})[0];                     // 转换到NPU
   auto q_k_v = part1({x});                       // QwenDecoderNPUPart1
   q_k_v = Tensor::toCPU(q_k_v);                  // 转回CPU
   
   auto o_x = qkv_mm(q_k_v)[0];                   // CPU矩阵乘法
   
   // NPU执行第二部分（MLP + Shadow数据准备）
   auto qnn_tensor = Tensor::toQNN({o_x, inputs[0]});
   auto decoder_out = part2({o_x, inputs[0]});    // 关键调用
   decoder_out = Tensor::toCPU(decoder_out);
   
   // CPU Shadow修正
   auto shadow_input_1 = decoder_out[0];          // NPU计算前的数据
   auto shadow_input_2 = decoder_out[1];          // NPU计算后的数据
   x = decoder_out[2];                            // NPU最终结果
   x = shadow_linear(shadow_input_1, shadow_input_2, x);  // Shadow修正
```
其中 part1 的类型都是 QwenDecoderNPUPart1，和是否 shadow 没关系，作用省流下就是拿到 QKV 三个矩阵的，其中用到了 Dequantize 来量化，这个东西后面再分析。这部分在 NPU 上完成

然后 qkv_mm 是 QwenQKVmm 类型，他的作用省流就是拿到 QKV 之后做 attn 层的具体计算，里面携带这 rope 加上位置信息，cache 来使用 KVCache，然后就直接做了 attn 的 QKV 矩乘。值得注意的是这部分是在 CPU 上完成的

其中 part2 的类型是 QwenDecoderNPUPart2WithShadow，非 Shadow 层的 Part2 是 QwenDecoderNPUPart2 类型，这两个东西的唯一区别在于接口不同，有 Shadow 版本会保存两个中间的计算产物，并返回三个张量，进而给后面的 shadow_layer 使用

#### Layer.hpp 分析

充斥着类和继承的文件

Layer 是基类，里面定义了 string 类型的 name，map（OpParam） 类型的 param，以及 Backend 类型的 backend，

所有的继承类都是通过重载 () 来调用，具体来说通过内部的 run 函数实际执行。run 里面先根据参数控制选择了不同类型的的 backend，大体有 MLLM_CPU 和 MLLM_QNN 几个类型的 backend。然后 ``return backend->runLayer(this, inputs, N);`` 直接调用

#### XXXBackend 分析

这个文件比较复杂，还没有分析完整，具体来说通过前面提到的 addCreator 来注册，进而映射算子。

注册的算子会通过 map_creator_ 来映射，具体调用的时候通过函数 opCreate 来实现具体通过 Creator 取出算子

在 runLayer 里会通过之前注册的信息选择不同的 creator，进而使用不同的后端计算

具体对应 shadow_linear 这个东西来说，经过层层解析最后调用链可以简单的这么总结：

```cpp
// src/models/qwen/modeling_qwen_npu.hpp
// 调用：x = shadow_linear(shadow_input_1, shadow_input_2, x);
x = shadow_linear(shadow_input_1, shadow_input_2, x);
    ↓
// src/Layer.hpp
// ShadowLinear::operator()
auto ts = run({shadow_input_1, shadow_input_2, x}, 1);
    ↓
// src/Layer.hpp
// Layer::run()选择后端（这里会选择CPU后端，因为Shadow在CPU上执行）
backend = Backend::global_backends[MLLM_CPU];  // Shadow强制在CPU执行
return backend->runLayer(this, inputs, N);
    ↓
// src/backends/qnn/QNNBackend.cpp
// CPUBackend::runLayer()
layer->op_ = layer->backend_->opCreate(layer->param_, layer->name_);
    ↓
// 通过 src/backends/qnn/QNNBackend.cpp 中注册的
// CPUBackend::opCreate()查找LINEARINT8SHADOW类型
OpType::LINEARINT8SHADOW → CPULinearINT8ShadowCreator
    ↓
// src/backends/cpu/op/CPULinearINT8Shadow.cpp
// 创建CPULinearINT8Shadow算子
return new CPULinearINT8Shadow(bn, name, in_features, out_features, max_position, (bool)bias);
```

通过这种层层传递的方式最后启用了 src/backends/cpu/op/CPULinearINT8Shadow.hpp 里的东西，这也是关于处理 outlier 的核心部分

#### CPULinearINT8Shadow

这个代码里面主要就一个类 CPULinearINT8Shadow，实现了一套方法，包括但不限于 load、execute 等，名称统一供 QNNBackend 中调用

CPULinearINT8ShadowCreator 继承自 Creator 负责把这个核心类传递出去

这个核心类的关键就是 reshape execute load free shadow_vec_dot_fp32_arm shadow_vec_dot_fp16_arm 这六个函数

- reshape

把内部的张量都 reshape 一下

- load

从模型文件中加载Shadow算子需要的所有参数

- free

free 掉内存，具体释放实现在基类里

- 两个 shadow_vec_dot

似乎就是不同类型的点集罢了，一个 FP16 一个 FP32

- execute

这个文件的核心

前面是一些预处理，整体上结构就是根据 FP16 还是 FP32 拆分成了两个巨大的 if

每一个 if 里整体结构是差不多的，都是被再次拆分成两个 if，第一个 if 是负责处理 input outlier，第二个是负责处理 output outlier

input outlier 的监测代码如下：

```cpp
float round_value = roundf(input0_buffer_.dataAt<float>(i, h, j, k) / input_scale);
if (round_value > (127.0 * 8) || round_value < (-128.0 * 8)) {
    // 处理 outlier
}
```

最终似乎是通过加法来修正的

```cpp
outputs[0]->setDataAt<float>(i, h, j, w, origin - clip + outputs[0]->dataAt<float>(i, h, j, w));
```

output outlier 的监测代码如下：

```cpp
if (input1_buffer_.dataAt<int8_t>(i, h, j, k) <= -128 || 
    input1_buffer_.dataAt<int8_t>(i, h, j, k) >= 127) 
{
    // 输出达到量化边界，可能存在饱和
}
```

最终似乎是通过覆盖来修正的

```cpp
outputs[0]->setDataAt<float>(i, h, j, k, input2_buffer_.dataAt<float>(i, h, j, k) - (input1_buffer_.dataAt<int8_t>(i, h, j, k) * output_scale) + roundf(sum / output_scale) * output_scale);
```

#### 回到 modeling_qwen_npu.hpp

注意到在选择 shadow 层时的依据是

```cpp
std::set shadowLayers = {1, 2, 26};
```

结构几乎一致的 modeling_phonelm_npu.hpp 里也有相同的内容：

```cpp
std::set shadowLayers = {0, 1, 3, 4};
```

可以分析发现这里 shadow 层的选择是完全根据这里硬编码的 set 决定的，完全依靠 offline 分析然后硬编码到这俩文件里实现。当然这也符合论文里的描述

具体 offline 分析的工具在 tools/convertor/profiling_activation 中，里面有一个 readme