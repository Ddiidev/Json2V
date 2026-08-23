# Json2V

Turn a JSON payload into ready-to-use [V (vlang)](https://vlang.io/) structs: paste JSON on the left, get the struct code on the right.

**[Try it live](https://ddiidev.github.io/Json2V/)**

Nested objects become their own structs and arrays with mixed types become sum types. A row of toggles controls the generated style:

- `@[omitempty]` tag
- All public fields/structs
- Reserved words escaped with `@`
- Anonymous structs instead of helper structs
- Reuse identical struct shapes

<br/>

## Demo

![screenshot](/assets/img1.png)

![screenshot](/assets/img2.gif)

![screenshot](/assets/img3.gif)

<br/>

# Stack utilizada

**Front-end:** [pico.css](https://picocss.com/), [lodash](https://lodash.com/)

**Code editor:** [ace](https://ace.c9.io/)

**Fonts:** [google fonts](https://fonts.googleapis.com)
