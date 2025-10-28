# WandB 版本说明

## 问题状态更新

**日期**: 2025年10月28日  
**测试版本**: WandB 0.22.2  
**状态**: ✅ **问题已修复**

## 版本对比

### ✅ WandB 0.22.2+ (当前推荐)

**状态**: 问题已修复

```python
import wandb

def train():
    run = wandb.init(project="test")
    # 训练代码...
    run.finish()

# ✅ 在 Jupyter 中可以运行，没有 LookupError
wandb.agent(sweep_id, function=train, count=3)
```

**测试结果**:
- ✅ 没有 `LookupError: shell_parent` 错误
- ✅ Sweep agent 可以在 Jupyter 中正常运行
- ✅ 可以正常初始化和记录数据

### ❌ WandB 0.21.0 (问题版本)

**状态**: 有 `shell_parent` bug

```python
wandb.agent(sweep_id, function=train, count=3)
# ❌ LookupError: <ContextVar name='shell_parent' at 0x...>
```

**错误堆栈**:
```
Traceback (most recent call last):
  File "wandb/sdk/wandb_init.py", line ...
  File "wandb/jupyter.py", line ..., in _PrinterJupyter.__init__
  File "ipykernel/zmqshell.py", line ..., in get_parent
    return shell_parent.get()
LookupError: <ContextVar name='shell_parent'>
```

### ✅ WandB 0.19.x (旧版本)

**状态**: 可以运行，但功能较少

- ✅ 没有 shell_parent 问题
- ⚠️ 缺少一些新特性
- ⚠️ 不推荐用于新项目

## 复现原始问题

如果你想**复现** GitHub issue 中报告的 `LookupError` 问题：

### 方法 1: 使用虚拟环境

```bash
# 创建新的虚拟环境
python -m venv wandb_021_env
source wandb_021_env/bin/activate  # Windows: wandb_021_env\Scripts\activate

# 安装问题版本
pip install wandb==0.21.0 ipywidgets traitlets jupyter

# 启动 Jupyter
jupyter notebook

# 运行 reproduce_issue.ipynb
```

### 方法 2: 在当前环境降级

```python
# 在 notebook 中运行
%pip install wandb==0.21.0

# 重启 kernel
# 然后运行 wandb.agent()
```

## 最佳实践建议

### 🎯 如果使用 WandB 0.22.2+

**技术上可行但仍不推荐** 在 notebook 中运行 `wandb.agent()`，原因：

1. **控制问题**: 难以优雅地停止运行
2. **阻塞问题**: 会阻塞 notebook 交互
3. **调试问题**: 错误输出可能混乱
4. **资源管理**: 难以并行运行多个 agent

**推荐做法仍然是**：
- ✅ Notebook: 数据探索、配置 sweep、分析结果
- ✅ 脚本 + 终端: 运行 sweep agent

### 🐛 如果使用 WandB 0.21.0

**必须使用脚本 + 终端**，因为：
- ❌ 在 notebook 中会直接报错
- ✅ 在独立脚本中正常工作

## 升级建议

如果你当前使用 0.21.0：

```bash
# 升级到最新版本
pip install --upgrade wandb

# 验证版本
python -c "import wandb; print(wandb.__version__)"
```

## Timeline

| 时间 | 版本 | 状态 |
|------|------|------|
| 早期 | 0.19.x | ✅ 可用 |
| 2024 | 0.21.0 发布 | ❌ 引入 shell_parent bug |
| 2024 | GitHub Issue 报告 | 🐛 用户发现问题 |
| 2024 | 0.22.x 发布 | ✅ 修复问题 |
| 2025-10-28 | 0.22.2 测试 | ✅ 确认修复 |

## 结论

1. **如果你在生产环境**: 使用 WandB 0.22.2+，问题已修复
2. **如果你要复现问题**: 使用 WandB 0.21.0
3. **无论哪个版本**: 推荐在独立脚本中运行 sweep agent

## 相关链接

- [WandB Release Notes](https://github.com/wandb/wandb/releases)
- [Original GitHub Issue](链接到原始 issue)
- [WandB Sweeps 文档](https://docs.wandb.ai/guides/sweeps)

