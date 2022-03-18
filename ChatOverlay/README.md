## Torn Chat Overlay

Adds support for Discord style markdown (formatting) and Emojis to Torn chat boxes.

### Supported markdown:

Markdown tage for strikeout, underline, bold, cursive and italic must come both before and after text to be affected.<br>
Superscript only works for the listed characters.<br>


1. ``~~strikeout~~`` ==> ~~strikeout~~
2. ``__underline__`` ==> <ins>underline</ins>
3. ``***bold italic***`` ==> ***bold italic***
3. ``**bold**`` ==> **bold**
4. ``*italic*`` ==> *italic* (sans serif)
5. ``_italic_`` ==> _italic_ (serif)
6. ``__**underline bold**__`` ==> TBD
7. ``__*underline italics*__`` ==> TBD
8. ``__***underline bold italics***__`` ==> TBD 
9. ``3^2, 2^3, A^+, B^-, 78^.`` ==> superscript 3<sup>2</sup>, 2<sup>3</sup>, A<sup>+</sup>, B<sup>-</sup>, 78&deg;

Any text that you wish to remain unchanged, if it contains the formatting characters, can be wrapped with 'codeblock' identifiers: double 'tick' marks, the character beneath the tilde. For example: <br>

In this sentence, ```` ``this will _remain_ *unchanged*`` ```` (the double tick marks will not display)


### Emojis:

``:shrug:`` ==> :shrug: <br>
``:facepalm:`` ==> :facepalm: <br>
``:rofl:`` ==> :rofl: <br>
``:thinking:`` ==> :thinking: <br>
``:grinning:`` ==> :grinning: <br>
``:zany_face:`` ==> :zany_face: <br>
``:kissing_heart:`` ==> :kissing_heart: <br>
``:heart_eyes:`` ==> :heart_eyes: <br>
``:face_with_tears_of_joy:`` ==> 😂 <br>
``:smiling_face_with_3_hearts:`` ==> [No Preview] <br>
``:shushing_face:`` ==> :shushing_face: <br>
``:smiley_face:`` ==> ☺ <br>
``:winking face:`` ==> 😉 <br>
``:grinning_squinting_face:`` ==> 😆 <br>

### Samples:

![Overlay Samples.png](https://github.com/edlau2/Tampermonkey/blob/master/ChatOverlay/Overlay%20Samples.png)

Note: many more are being (and have been) added; using auto-complete will display them all.<br>
Type ':' in the chat box textarea to bring up a complete list.


