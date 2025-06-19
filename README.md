# JTeX

JTeX is a sophisticated high-level language designed to simplify and enhance the process of creating PDF files. It introduces a set of new syntax elements designed to streamline your workflow, while fully maintaining compatibility with traditional LaTeX code. This means you can write in LaTeX within JTeX, and your code will remain untouched by the compiler, establishing JTeX as an exceptional extension to LaTeX.

The real power of JTeX lies in its dedicated JTeX Client, which enables seamless conversion of `.jtex` files to `.tex` files. Furthermore, it offers automatic conversion of these files to PDF format, making document creation more straightforward than ever.

## System Requirements

JTeX currently supports the following operating systems:

- Windows
- macOS (Darwin)

## Prerequisites

Before you begin the installation process, ensure that MikTex is installed on your system, and the terminal can recognise the command pdflatex. If you haven't installed it already, you can download it from the official [MikTex website](https://miktex.org/download).

## Installation

The installation process varies depending on your operating system. First, clone the [JtexClient repository](https://github.com/Jaybit0/JtexClient).

### For Windows:
1. Navigate to the directory containing the `setup.bat` file in the command prompt.
2. Execute the script by typing `setup.bat` and pressing `Enter`.
3. After the script has finished running, restart your computer to update the system path variables.

### For macOS:
1. Open a terminal window.
2. Navigate to the directory containing the install.sh file using the cd command.
3. Execute the script by typing `./install.sh` and pressing Enter.

## Usage

After installation, you can run JTeX by typing `jtex [help]` in the terminal or command prompt. For information about our syntax, please read the [docs](doc/readme.md).

## Contributing

We welcome contributions from the community. If you wish to contribute, please take a look at our contributing guidelines.

## License

JTeX is licensed under the MIT License.

## Contact

If you have any questions, issues, or feedback, please open an issue on this repository.
