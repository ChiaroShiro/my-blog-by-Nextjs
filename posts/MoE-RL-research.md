---
title: 'MoE与强化学习笔记'
date: '2025-05-15'
tags: [ 'RL', 'AI', 'LLM', '笔记' ]
---

## OLMOE: OPEN MIXTURE-OF-EXPERTS LANGUAGE MODELS

> ICLR 2025

用 MoE 技术构建了一个小模型，总参数7B，激活1B，但是跑的效果十分之好。具体对微调、MoE的专家选择做了优化，分析了很多路由数据来更好的路由并复杂均衡。代码开源

微调时用了强化学习的 DPO 方法，因为模型很小，所以16位参数可以用14G内存跑在个人电脑上

## MOE++: ACCELERATING MIXTURE-OF-EXPERTS METHODS WITH ZERO-COMPUTATION EXPERTS

> ICLR 2025

在原始MoE基础上加了些新东西，主要是加了三个零计算量层

- 零专家（Zero Expert）：直接丢弃某些 token 的计算；

- 复制专家（Copy Expert）：跳过当前层，将上一层的输出直接复制作为本层输出；

- 常量专家（Constant Expert）：将 token 以可学习的常量向量替换，完成“替代”操作。

并且在路由层引入了残差机制，就是说上一层的门控选择会影响这次的选择

可以模型质量超过原模型的基础上加快速度。不过和强化学习似乎没啥关系

## LSH-MoE: Communication-efficient MoE Training via Locality-Sensitive Hashing

> NeurIPS 2024

一个注重训练优化的论文，用局部敏感哈希算法对tokens进行聚类，并通过只传输聚类中心点来了减少通信量，并加入了一些比如残差补偿的优化 tricks。和推理优化似乎没啥关系

但是 P3 中提到强化学习是一种比较常见的门控方法，但给出的三个参考引用都是 2020 年前的老古董

## MoE Jetpack: From Dense Checkpoints to Adaptive Mixture of Experts for Vision Tasks

> NeurIPS 2024

这个论文主要关注的是通过训练密集模型再微调到 MoE 的方法，不过在里面他还提出了一个 MoE 推理的优化

P6 的 3.2 里提到了一个双路 MoE 路由的方法，简要来说就是根据 token 的重要性不同分成两种，一种 tokens 走的是核心路径，会有比较少但是参数规模比较大的层去处理，另一种走的是通用路径，会有比较多但是参数规模相应变小的层去处理这个 tokens

## MoEUT: Mixture-of-Experts Universal Transformers

> NeurIPS 2024

提出了一种将通用Transformer（UT）结合MoE的方法，相较于以前有了很多优势，而且节省了内存使用。

论文里说通过MoE和UT混合的方式实现了降低内存的效果，但是似乎没有找到内存的管理方式，也不知道是为什么能降低内存的，很奇怪，不太懂

## ADA-K ROUTING: BOOSTING THE EFFICIENCY OF MOE-BASED LLMS

> ICLR 2025

提出了 Ada-K 路由方法，与传统 MoE 固定选 k 个不同，这个论文里的新方法要根据 token 选择 k 的大小，复杂的 token 要激活更多的专家，信息少的 token 要少激活点专家。这玩意儿好像很适合用强化学习搞，论文里也是用的 PPO 的强化学习方法进行的。

具体来说就是在传统 MoE 的 Gate 前加一层强化学习层，输出 k 大小的概率分布

## SMOSE: Sparse Mixture of Shallow Experts for Interpretable Reinforcement Learning in Continuous Control Tasks

> AAAI 2025

机器人操作等连续控制领域强化学习应用比较广泛，但是强化学习的结果是不可解释的，这个论文就是研究怎么让他可解释，用的方法是 MoE。

具体来说就是用强化学习训练整个 MoE 架构，包括专家和门控，其中门控是可解释的，这样在跑的时候就可以根据每次门控选择的结果建立决策树之类的东西来解释整个过程。