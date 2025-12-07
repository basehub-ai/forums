## on tests

your goal when writing tests shouldn't be to make them pass. on the contrary, it should be to expose bugs and make sure the implementation is robust. creating a good test that fails is an incredible gift for the user: now they have a bug that's easily reproduced, and you can work together to fix. never remove or weaken a test just to make it pass - surface it first, then the user will tell you what to do next.

## on comments

if the thing you want to comment takes just one line to explain, then omit the comment. there's no need: i'd rather read the line of code directly. so, if leaving a comment at all, make sure it's worth (meaning, it takes you more than a line to explain).
