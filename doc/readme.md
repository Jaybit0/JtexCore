# Jtex converter

The Jtex-converter is a javascript converter to enhance the workflow of writing LaTeX-code. While you are able to write standard LaTeX-code, the converter is able to convert high-level syntax elements to valid LaTeX-code.

## Headers

### Use

With the use-header, you are able to easily import LaTeX packages. Thus, the expression

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

Note that this header is only recognized if it is the first element in the document. However, you are able to write comments that will be transferred to the output LaTeX-document.

## Body

The body contains the content that should be converted to LaTeX-code. You are able to utilize any Syntax elements recognized in LaTeX. Additionally, you are able to write [Jtex-commands](#commands).

## Commands

Jtex-commands always start with the prefix `--`. If given command doesn't exist, the command name will be interpreted as the name itself. Thus, you are able to escape any chars like keywords.

Here, we will provide a list of basic commands provided by the converter:

| Command | Description                                                                                   | Example   |
| ------- | --------------------------------------------------------------------------------------------- | --------- |
| `--\s`  | Starts the [inline math-mode](#inline-math-mode) and is indicated by any whitespace character | `-- 1/2;` |

## Math mode

The Jtex math mode extends the LaTeX math mode from `amsmath` by providing additional syntax elements.

### Inline math mode

The inline math mode is indicated by `--` followed by any whitespace. Here, the converter interprets [basic syntax](#basic-syntax) and converts it to a LaTeX inline expression. For instance, the expression

```
-- a := 2/(3+5);
```

will be converted to

```
$a:=\frac{2}{3+5}$
```

Note that `;` is used to indicate the end of the inline math mode. However, `;` will be interpreted as a string if occurring within any brackets.

### Symbols

| Symbol | Description | Example   | Output             |
| ------ | ----------- | --------- | ------------------ |
| `=>`   | Implication | `x => y`  | `x \implies{} y`   |
| `<=`   | Implied by  | `x <= y`  | `x \impliedby{} y` |
| `<=>`  | Equivalence | `x <=> y` | `x \iff{} y`       |

### Binary operators

| Operator | Description | Example     | Output          |
| -------- | ----------- | ----------- | --------------- |
| `/`      | Fraction    | `1/(2+3)`   | `\frac{1}{2+3}` |
| `*`      | Product     | `1*2`       | `1\cdot{}2`     |
| `^`      | Power       | `2^(3+4)`   | `{2}^{3+4}`     |
| `^-`     | Overline    | `x^-`       | `\overline{x}`  |
| `_`      | Subscript   | `x_(2n)`    | `{x}_{2n}`      |
| `//`     | Integral    | `(0)//(10)` | `\int_{0}^{10}` |

## Comments
