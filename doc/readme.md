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

Jtex-commands always start with the prefix `--`. If given command doesn't exist, the command name will be interpreted as the name itself. Thus, you are able to escape any chars like keywords (TODO).

Here, we will provide a list of basic commands provided by the converter:

| Command | Description                                                                                   | Example   |
| ------- | --------------------------------------------------------------------------------------------- | --------- |
| `--\s`  | Starts the [inline math-mode](#inline-math-mode) and is indicated by any whitespace character | `-- 1/2;` |
| `--m`   | Starts the [Block-math-mode](#block-math-mode)                                                | `--m{1/2}`|

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

### Block math mode

The block math mode is indicated by `--m` or `--math`, followed by curly brackets. The converter interprets the input and converts it to a an align* environment in LaTeX. The expression
```
--m{
    x &= (3/2)^2\\
    &=  2.25
}
```

will be converted to 
```
\begin{align*}
    x &= \left(\frac{3}{2}\right)^{2}\\
    &=  2.25
\end{align*}
```

### Symbols

Jtex replaces many symbols automatically in math mode, to help with fulfilling the conventions.

| Symbol | Description | Example     | Output             |
| ------ | ----------- | ---------   | ------------------ |
| `=>`   | Implication | `x => y`    | `x \implies{} y`   |
| `<=`   | Implied by  | `x <= y`    | `x \impliedby{} y` |
| `<=>`  | Equivalence | `x <=> y`   | `x \iff{} y`       |
| `...`  | TripleDot   | `1, ..., n` | `1, \ldots{}, n`   |
| `:`    | Colon       | `x: x<y `   | `x \colon{} x<y`   |
| `:=`   | Colonequal  | `x := 2 `   | `x \coloneqq{} 2`  |
| `=:`   | Equalcolon  | `2 =: x `   | `2 \eqqcolon{} x`  |

### Unary Operators 

| Operator | Description | Example     | Output                    |
| -------- | ----------- | ----------- | ------------------------- |
| `°`      | Set         | `°(1, 2, 3)`| `\left\{1, 2, 3 \right\}` |


### Binary operators

| Operator | Description | Example     | Output          |
| -------- | ----------- | ----------- | --------------- |
| `/`      | Fraction    | `1/(2+3)`   | `\frac{1}{2+3}` |
| `*`      | Product     | `1*2`       | `1\cdot{}2`     |
| `^`      | Power       | `2^(3+4)`   | `{2}^{3+4}`     |
| `^_`     | Overline    | `x^_`       | `\overline{x}`  |
| `_`      | Subscript   | `x_(2n)`    | `{x}_{2n}`      |
| `//`     | Integral    | `a//b`      | `\int_{a}^{b}`  |

Notice, that you should use parentheses and not curly brackets like in normal LaTeX to use operators on a sequence of characters.

## Matrix

You can easily create matrices using matrix command `--mat` or `--matrix` in [math mode](#math-mode).

### Explicit matrix definition

The simplest way to define a matrix is using an explicit definition according to the example below.

```
--m{
    --mat{
        1, 2, 3
        4, 5, 6
        7, 8, 9
    }
}
```

Matrix entries are separated by commas, while rows are distinguished by line breaks or semicolons.

### Storing, recalling and hiding a matrix

You are able to store and recall matrices at later times. Keep in mind that recalling a matrix is only possible if it has been defined in the code above.

```
--m{
    --mat.store(my_matrix){
        1, 2, 3
        4, 5, 6
        7, 8, 9
    }
    --mat.recall(my_matrix)
}
```

If you recall a matrix, it is cloned. To overwrite the original matrix after modifying it, you need to call the function `store` again. Right now, `store` is a downstream function so it does not matter at what position you put it. This behaviour might be changed in future.

When storing a matrix, you might not want to display it at that position. Thus, there is a possibility to hide the matrix. You are then able to recall the matrix at a later point.

```
--m{
    --mat.store(my_matrix).hide(){
        1, 2, 3
        4, 5, 6
        7, 8, 9
    }
    --mat.recall(my_matrix)
}
```

### Implicit matrix initialization

Sometimes you might want to initialize an empty matrix with fixed dimensions and fill them programmatically. You can do that with using the initializer `empty(<x>, <y>)`, where `<x>` is the width and `<y>` is the height of the matrix.

```
--m{
    --mat.empty(5, 5)
}
```

### Matrix manipulation

| Manipulator | Description | Example     |
| -------- | ----------- | ----------- |
| `fill`      | Fills empty entries with the token specified    | `*.fill(0)`   |
| `set`      | [Sets a part of a matrix](#manipulation-using-set)     | `*.set(row: 2, (1, 2, 3))`       |
| `setblock`      | Sets a block of a matrix to a given stored matrix    | `*.setblock(3, 3, my_matrix)`   |

### Manipulation using set

The `set` manipulator is a general manipulation tool. You can either set single entries or entiere rows / columns. You can set a single entry with `*.set(<x>, <y>, <entry>)`.

```
--m{
    --mat.empty(5, 5).fill(0).set(2, 2, 5)
    --mat.empty(5, 5).fill(0).set(entry: 2, 2, 5)
}
```

As in line three of the above example, you can also use annotations before the first parameter two clarify the type of set operation. You can either use the keywords `entry`, `pos`, `position`, `loc`, or `location` to set a single entry.

You can also set rows and columns in a matrix. Currently, it is only possible to set columns if the given vector size matches the matrix size. For that, you can use the annotation keywords `col`, `column` or `row`.

```
--m{
    --mat.empty(5, 5).fill(0).set(row: 2, (1, 2, 3, 4, 5))
    --mat.empty(5, 5).fill(0).set(col: 2, (1, 2, 3, 4, 5))
}
```

### Other matrix functions

| Manipulator | Description | Example     |
| -------- | ----------- | ----------- |
| `store`      | [Stores a matrix](#storing-recalling-and-hiding-a-matrix)    | `*.store(my_matrix)`   |
| `recall`      | [Recalls a matrix](#storing-recalling-and-hiding-a-matrix)     | `*.recall(my_matrix)`       |
| `hide`      | [Hides a matrix](#storing-recalling-and-hiding-a-matrix)    | `*.setblock(3, 3, my_matrix)`   |

## Comments

Comments in a single line can be used identical to normal LaTeX with the character `%`. 

In contrast to LaTeX, one may also use block comments, which can span over multiple lines. Here, `/*` marks the beginning of a block comment and `*/` marks the end. 
When compiling to LaTeX Code, these block comments will be compiled to multiple single-line comments in LaTeX, i. e. there will be placed a `%` in front of every line of the block comment.

## Known Bugs

When using parentheses in math mode without any operator, JTex will automatically place `\left` and `\right` (see [Math mode](#math-mode)). This creates a problem, when `\left` and `\right` were already placed by the user, 
because it leads to a doubling of operators in the LaTeX file, which throws a compilation error. It is therefore necessary, to not use these LaTeX operators on round parentheses in JTex math mode. In future versions, it is planned to 
check whether the user already placed `\left` and `\right` before placing it again in the compilation process, to assure compatibility of JTex math mode and the LaTeX equation environment. 