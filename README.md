# WandB Sweep Jupyter Sample

A simple example demonstrating how to run WandB hyperparameter sweeps in Jupyter notebooks.

## Features

✅ **Works with WandB 0.22.2+**  
✅ Step-by-step tutorial  
✅ Ready to run in Jupyter/VSCode  

## Quick Start

### 1. Install Dependencies

```bash
pip install wandb>=0.22.2 ipywidgets traitlets
```

### 2. Run the Notebook

Open `sweep_sample.ipynb` and follow the step-by-step guide.

## What's Included

- **sweep_sample.ipynb** - Interactive tutorial showing:
  - Sweep configuration
  - Training function setup
  - Running sweep agents
  - Tracking results

## Requirements

- Python 3.8+
- WandB 0.22.2 or higher
- Jupyter Notebook or VSCode with Jupyter extension

## Usage

The notebook demonstrates:

1. Setting up sweep configurations (random/grid/bayes search)
2. Defining training functions
3. Running sweep agents directly in Jupyter
4. Monitoring hyperparameter experiments

## Note

**WandB 0.21.0 had issues running sweeps in Jupyter notebooks.** This example uses WandB 0.22.2+, which resolves those issues.

## Links

- [WandB Documentation](https://docs.wandb.ai/)
- [WandB Sweeps Guide](https://docs.wandb.ai/guides/sweeps)

## License

MIT

