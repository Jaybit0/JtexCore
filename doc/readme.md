# Jtex converter

The Jtex-converter is a javascript converter to enhance the workflow of writing LaTex-code. While you are able to write standard LaTex-code, the converter is able to convert high-level syntax elements to valid LaTex-code.

## Headers

### Use

With the use-header, you are able to easily import LaTex packages. Thus, the expression

```
\usepackage{amsmath}
\usepackage{amssymb}
```

can also be written as

```
use amsmath, amssymb
```

or

```
use amsmath
use amssymb
```

Note that this header is only recognized if it is the first element in the document. However, you are able to write comments that will be transferred to the output LaTex-document.

## Body

The body contains the content that should be converted to LaTex-code. You are able to utilize any Syntax elements recognized in LaTex. Additionally, you are able to write [Jtex-commands](#commands).

## Commands

Jtex-commands always start with the prefix `--`. If given command doesn't exist, the command name will be interpreted as the name itself. Thus, you are able to escape any chars like keywords (TODO).

Here, we will provide a list of basic commands provided by the converter:

`-- `: Starts the [inline math-mode](#inline-math-mode) and is indicated by any whitespace character

## Math mode

The Jtex math mode extends the LaTex math mode from `amsmath` by providing additional syntax elements.

### Inline math mode

The inline math mode is indicated by `--` followed by any whitespace. Here, the converter interprets [basic syntax](#basic-syntax) and converts it to a LaTeX inline expression. For instance, the expression

```
-- a := 2/(3+5);
```

will be converted to

```
$a:=\frac{2}{3+5}$
```

### Symbols

(TODO)

| Symbol | Description | Example  | Output         |
| ------ | ----------- | -------- | -------------- |
| `=>`   | Implication | `x => y` | `x \implies y` |

### Binary operators

| Operator | Description | Example     | Output          |
| -------- | ----------- | ----------- | --------------- |
| `/`      | Fraction    | `1/(2+3)`   | `\frac{1}{2+3}` |
| `*`      | Product     | `1*2`       | `1 \cdot 2`     |
| `^`      | Power       | `2^(3+4)`   | `2^{3+4}`       |
| `//`     | Integral    | `(0)//(10)` | `\int_{0}^{10}` |

## Comments
