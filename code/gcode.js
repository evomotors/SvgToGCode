	var fileName;
	var svgImage;
	var fileData;
	var scaleMultiplier = 1;
	
	const targetWidth = 1024;
	const targetHeight = 256;

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
	
	function ParseSVG(){							   
		try
		{	
			// stroke color for combined color SVGs 
			var strokeColor = "rgb(1,1,1)";
			
			// create combined colors canvas and get it's context
			var mctx = GetCanvas(strokeColor).getContext("2d");

			for(var shape = svgImage.shapes; shape != null; shape=shape.next){
				if((strokeColor = GetStrokeColor(shape)) != null){	
				
					var canv = GetCanvas(strokeColor);
					var ctx = canv.getContext("2d");
					
					gcodeCommands = GetColorCommands(strokeColor,canv);
					
					for (var path = shape.paths; path!=null; path = path.next){
						var x = rescale(path.pts[0]);
						var y = rescale(path.pts[1]);
							
						gcodeCommands.push({Move:"G0", X:x, Y:y, Z:0.25});
						ctx.moveTo(x, y);
						mctx.moveTo(x, y);
						
						for (var i = 2; i < path.pts.length; i += 6 ){
							var bizierPoints = GetBezierPoints([x,y, 
								rescale(path.pts[i]),rescale(path.pts[i + 1]), 
								rescale(path.pts[i + 2]),rescale(path.pts[i + 3]), 
								rescale(path.pts[i + 4]),rescale(path.pts[i + 5])], 5 /*defines number of lines that will be returned*/); 
							
							bizierPoints = OptimizeBizierPoints(bizierPoints);
							
							for(var b = 0; b < bizierPoints.length; b += 2){
								gcodeCommands.push({Move:"G1", X:bizierPoints[b], Y:bizierPoints[b + 1], Z:-0.01});
								ctx.lineTo(bizierPoints[b], bizierPoints[b + 1]);
								mctx.lineTo(bizierPoints[b], bizierPoints[b + 1]);
							}
							
							x = rescale(path.pts[i + 4]); 
							y = rescale(path.pts[i + 5]);
						}
					}
				}
			}
			
			Finish(mctx);
		}
		catch(e){
			$(".alert-error").html('<strong>Error!</strong> ' + e.toString());
			$(".alert-error").css("display", "block");
		}
	}	
	
	function OptimizeBizierPoints(bizierPoints)
	{
		var x1 = bizierPoints[0], y1 = bizierPoints[1], 
			x2 = bizierPoints[4], y2 = bizierPoints[5],
			x3 = bizierPoints[8], y3 = bizierPoints[9];
			
		if(Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)).toFixed(2)==0.00)
			return [x1,y1,x3,y3];
		else
			return bizierPoints;
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
