<h2>SvgToGCode</h2>
<h3>The code is created to generate g-code file to be used with EggBot, but it can be easily extended to be used for other purpose.</h3>

This code converts SVG file to simplified g-code (G0 ang G1 moves only) using nanosvgjs (Zero dependency JavaScript SVG parser based on a translation of the NanoSVG C code) and draws converted g-code on the canvas.  

<b>Aditional functionality</b><br />
<i>Generation of multiple G-code files separated by color for multicolor SVGs</i>

<b>Usage</b><br />
Load test.html in web browser, click on [Choose file] to load svg image. After loading the SVG if will be automatically parsed and redrawn on the canvas. Click generated image to download g-code 

![Capture1](https://user-images.githubusercontent.com/19974755/58049856-d63a7700-7b1b-11e9-836e-78b779d2456d.PNG)
<br/>
![Capture1](https://user-images.githubusercontent.com/19974755/58050462-662cf080-7b1d-11e9-9f3b-2a3a4254e7e9.PNG)
![Capture2](https://user-images.githubusercontent.com/19974755/58050486-7cd34780-7b1d-11e9-8852-56b15dfced2f.PNG)


link to nanosvgjs: https://github.com/deanm/nanosvgjs
