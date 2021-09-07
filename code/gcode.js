	var fileName;
	var svgImage;
	var fileData;
	var scaleMultiplier = 1;
	var limit = 1.0
	var interp = 50
	
    const targetWidth = 793;
    const targetHeight = 1122;

	var gcodeColorCommands=[{Canvas:null, Color:"empty", Command:[{Move:"", X:0, Y:0, Z:0}]}];
	var gcodeCommands=[];

	ClearAll();
	
	function readURL(input) {
		ClearAll();
		
		if (input.files && input.files[0]) {
			var reader = new FileReader();

			reader.onload = function (e) {
				fileData = e.target.result;
				svgImage = nsvgParse(fileData, 'px', 96);
				SetScaleMiltiplier();
				ParseSVG();
			};

			reader.readAsText(input.files[0]);
			fileName = input.files[0].name;
		}
	}

	function ParsePaths(paths, line, move) {
        for (var path = paths; path!=null; path = path.next){
            //Iterate through all the paths in the parsed svg file and access the points
            var x = rescale(path.pts[0]);
            var y = rescale(path.pts[1]);

            //Initial point
            move(x,y)
            for(var b = 2; b < path.pts.length; b += 6){
                // Iterate the Cubic Bezier curves outlined by the points.
                var p0x = rescale(path.pts[b-2]);
                var p0y = rescale(path.pts[b-1]);
                var p1x = rescale(path.pts[b])
                var p1y = rescale(path.pts[b+1])
                var p2x = rescale(path.pts[b+2])
                var p2y = rescale(path.pts[b+3])
                var x = rescale(path.pts[b+4])
                var y = rescale(path.pts[b+5])
                step = 1.0 / interp
                var xto = null
                var yto = null
                var t = 0
                for (var i = 0; i <= interp; i += 1) {
                    // Between values of t for 0 and 1 calculate the point at t within the curve.
                    t = step * i
                    xt = (1-t)*(1-t)*(1-t)*p0x + 3*(1-t)*(1-t)*t*p1x + 3*(1-t)*t*t*p2x + t*t*t*x;
                    yt = (1-t)*(1-t)*(1-t)*p0y + 3*(1-t)*(1-t)*t*p1y + 3*(1-t)*t*t*p2y + t*t*t*y;
                    if ((Math.abs(xto - xt) < limit && Math.abs(yto - yt) < limit))
                         continue // too close to previous point, skip
                    line(xt,yt)
                    xto = xt
                    yto = yt
                }
                //Place final value.
                line(x,y)
            }
        }
	}

	function ParseSVG(line, move){
		try
		{	
			// stroke color for combined color SVGs 
			var strokeColor = "rgb(1,1,1)";
			
			// create combined colors canvas and get it's context
			var mctx = GetCanvas(strokeColor).getContext("2d");

			for(var shape = svgImage.shapes; shape != null; shape=shape.next){
				if((strokeColor = GetStrokeColor(shape)) == null) continue

                var canv = GetCanvas(strokeColor);
                var ctx = canv.getContext("2d");

                gcodeCommands = GetColorCommands(strokeColor,canv);
				function move(x, y) {
                   gcodeCommands.push({Move:"G0", X:x, Y:y, Z:0.25});
                   ctx.moveTo(x, y);
                   mctx.moveTo(x, y);
				}
				function line(x,y) {
                    gcodeCommands.push({Move:"G1", X:x, Y:y, Z:-0.01});
                    ctx.lineTo(x, y);
                    mctx.lineTo(x, y);
				}
                ParsePaths(shape.paths, line, move)
            }
            Finish(mctx);
        }
		catch(e){
			$(".alert-error").html('<strong>Error!</strong> ' + e.toString());
			$(".alert-error").css("display", "block");
		}
	}	

	function GetCanvas(color)
	{
		var canvas = document.getElementById('cnv'+color);
		if(canvas==null){
			var div = document.createElement("p");
			div.style.width=targetWidth+'px';
			div.id='p'+color;
			div.style.backgroundColor=color;
			
			var cmd = document.createElement("button");
			cmd.id='cmd'+color;
			cmd.type='button';
			
			cmd.innerHTML='Download ' + (color=="rgb(1,1,1)"?'in one color.':color);
			cmd.style.width=targetWidth+'px';
			cmd.addEventListener('click', function() { SaveGCode(this.id); }, false);
			
			canvas = document.createElement("canvas");
			canvas.id = 'cnv'+color;
			canvas.width=targetWidth;
			canvas.height=targetHeight;
			canvas.getContext("2d").strokeStyle = color;
			canvas.getContext("2d").beginPath();
			
			div.appendChild(canvas);
			div.appendChild(cmd);
			
			document.getElementById("canvases").appendChild(div);
		}
		return canvas;
	}

	function SetScaleMiltiplier()
	{
		// Figure out the ratio
		var ratioX = targetWidth / svgImage.width;
		var ratioY = targetHeight / svgImage.height;
		
		// use whichever multiplier is smaller
		scaleMultiplier = ratioX < ratioY ? ratioX : ratioY;
	}
	
	function ClearAll()
	{
		$(".alert").css("display", "none");
		$("#canvases").html("");
		gcodeCommands.length = 0;
		gcodeColorCommands.length = 0;
	}
	
	function Finish(mctx)
	{
		// finish paint combined color canvas
		mctx.stroke();
		
		// finish paint individual color canvases
		for(gcodeColorCommand of gcodeColorCommands)
			if(gcodeColorCommand.Canvas != null)
				gcodeColorCommand.Canvas.getContext("2d").stroke();
		
		debugger;
		var numOfColors = $("canvas").length-1;
		var message = "Generated g-code instructions for " + numOfColors.toString()  + 
			" color" + (numOfColors>1?"(s)":"");
		
		// show success alert and hide error
		$(".alert-success").html('<strong>Success!</strong> ' + message);
		$(".alert-success").css("display", "block");
		
		// remove second canvas if there is only one color
		if($("p").length == 2)
			$("p:last").remove();
		
		// force cursor 
		$(document).css('cursor', 'pointer');
		
		return;
	}
	
	function GetStrokeColor(shape)
	{
		if(shape.stroke.color == 0 && shape.stroke.fillcolor == null && shape.fill.color == null)
			return null;
		else if(shape.stroke.color == 0 && shape.stroke.fillcolor != null)
			return shape.stroke.fillcolor;
		else if(shape.stroke.color == 0 && shape.fill.color != null)
			return shape.fill.color;					
		else
			return shape.stroke.color;
	}
	
	function GetByKey(array, key, value){
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] === value) {
				return array[i];
			}
		}
		return null;
	}	
	
	function GetColorCommands(strokeColor, canv)
	{
		var gcodeCommands=[];
		var objCommands;
		
		if((objCommands = GetByKey(gcodeColorCommands, 'Color', strokeColor)) == null)
			gcodeColorCommands.push({Canvas:canv, Color:strokeColor, Command:gcodeCommands});
		else
			gcodeCommands = objCommands.Command;
		
		return gcodeCommands;
	}
	
	function rescale(x){
		return x * scaleMultiplier;
	}

	function SaveGCode(canvasId)
	{
		$.confirm({
			boxWidth: '30%',
			useBootstrap: false,
			title: 'SVG to G-Code',
			content: '<font color="'+GetHexFromRGB(canvasId.substring(3))+'">"Download G-Code for this color?"</font>',
			buttons: {
				cancel: function () {
					return;
				},
				somethingElse: {
					text: 'Yes please',
					btnClass: 'btn-blue',
					keys: ['enter', 'shift'],
					action: function(){
						DownloadGCode(canvasId);
					}
				}
			}
		});
	}
	
	function DownloadGCode(canvasId){	
		
		// G21 is to use mm and G90 to use absolute positioning
		var commands=['G21 G90\r\n'];
		var opCommands=[];
		
		debugger;
		
		if(canvasId.substring(3)=="rgb(1,1,1)"){
			for(gcodeColorCommand of gcodeColorCommands)
				for(var gcodeCommand of gcodeColorCommand.Command)
					commands.push(gcodeCommand.Move + ' X' + gcodeCommand.X + ' Y' + gcodeCommand.Y + ' Z' + gcodeCommand.Z + '\r\n');
		}
		else
		{
			colorCommands = GetColorCommands(canvasId.substring(3))
			for(var gcodeCommand of colorCommands)
				commands.push(gcodeCommand.Move + ' X' + gcodeCommand.X + ' Y' + gcodeCommand.Y + ' Z' + gcodeCommand.Z + '\r\n');
		}
		
		let a = document.createElement('a');
		a.style = 'display: none';
		document.body.appendChild(a);
		let url = window.URL.createObjectURL(new Blob(commands));
		a.href = url;
		a.download = fileName + '.nc';
		a.click();
		window.URL.revokeObjectURL(url);
	}
	
	function GetHexFromRGB(color)
	{
		var matchColors = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/;
		var match = matchColors.exec(color);
		
		debugger;
		
		if (match !== null) {
			var r = parseInt(match[1]).toString(16), g = parseInt(match[2]).toString(16), b = parseInt(match[3]).toString(16);
			return  "#" + (r == "0" ? "00" : r) + (g == "0" ? "00" : g) + (b == "0" ? "00" : b);
		}
	}
