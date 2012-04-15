function insertline(line, sensordat) {
    var elem;
    var i, temp, tim, rssi, rh, vmcu;

    tim=1;
    elem = line.split(' ');
    if(elem.length < 4) return null;
    //            try {
    for(i=0;i<elem.length;i++) { 
        if(elem[i].substr(0,3) == "UT=")
	    tim=parseInt(elem[i].substr(3))*1000;
        if(elem[i].substr(0,3) == "ID=")
	    sensorid = elem[i];
        if(elem[i].substr(0,2) == "T=")
            temp=parseFloat(elem[i].substr(2));
        if(elem[i].substr(0,3) == "RH=")
            rh=parseFloat(elem[i].substr(3));
        if(elem[i].substr(0,5) == "RSSI=")
            rssi=parseFloat(elem[i].substr(5));
        if(elem[i].substr(0,6) == "V_MCU=")
            vmcu=parseFloat(elem[i].substr(6))*10;

    }
    //            } catch(err) { return null; }
    if(tim == 1) return null;

    if(temp) { 
	if(!sensordat[ sensorid + "-temp" ]) {
	    sensordat[ sensorid + "-temp" ] = [ ];
	    sensordat[ "sensors" ].push(sensorid);
	    sensordat[ "series" ].push(sensorid+"-temp");
	    sensordat[ "series" ].push(sensorid+"-rh");
	    sensordat[ "series" ].push(sensorid+"-rssi");
	    sensordat[ "series" ].push(sensorid+"-vmcu");
	    sensordat[ sensorid + "-temp" ].yaxis = 1;
	}
	sensordat[ sensorid + "-temp" ].push( [ tim, temp ] );
    }
    if(rh) { 
	if(!sensordat[ sensorid + "-rh" ]) {
	    sensordat[ sensorid + "-rh" ] = [ ];
	    sensordat[ sensorid + "-rh" ].yaxis = 2;
	}
	sensordat[ sensorid + "-rh" ].push( [ tim, rh ] );
    }
    if(rssi) { 
	if(!sensordat[ sensorid + "-rssi" ])
	    sensordat[ sensorid + "-rssi" ] = [ ];
	sensordat[ sensorid + "-rssi" ].push( [ tim, rssi ] );
    }
    if(vmcu) { 
	if(!sensordat[ sensorid + "-vmcu" ])
	    sensordat[ sensorid + "-vmcu" ] = [ ];
	sensordat[ sensorid + "-vmcu" ].push( [ tim, vmcu ] );
    }
}

function insertdata(text, sensordat) {
    var i;
    var elem;
    var narr = [ ];
    var arr = text.split('\n');
    for(i=0;i<arr.length;i++) {
        insertline(arr[i], sensordat);
    }
}

function convertline(line) {
    var elem;
    var i, temp, tim;
    var value = { };

    tim=1;
    elem = line.split(' ');
    if(elem.length < 4) return null;
    //            try {
    for(i=0;i<elem.length;i++) { 
        if(elem[i].substr(0,3) == "UT=")
	    tim=parseInt(elem[i].substr(3))*1000;
        if(elem[i].substr(0,3) == "ID=")
	    value["id"] = elem[i];
        if(elem[i].substr(0,2) == "T=")
            temp=parseFloat(elem[i].substr(2));
    }
    //            } catch(err) { return null; }
    if(tim == 1) return null;
    if(temp == undefined) return null;
    value[ "tuple" ] = [ tim, temp ];
    return value;
}

function convertdata(text) {
    var i;
    var elem;
    var narr = [ ];
    var arr = text.split('\n');
    for(i=0;i<arr.length;i++) {
        elem = convertline(arr[i]);
        if(elem != null) {
	    narr.push(elem["tuple"]);
	}
    }
    return narr;
}

function binarysearch(url, target, start, end) {
    var point;
    var r;
    var iter=0;

    // Type conversion
    start=start-0;
    end=end-0;
    
    console.log("end = " + end);

    while(1) {
	if(iter++ > 10) break;
	
	// get (start+end)/2
	point = Math.floor((start+end)/2);
	
	a = $.ajax({
	    beforeSend: function(xhrObj){
		var rh;
		rh = "bytes=" + point + "-" + (point+256);
		xhrObj.setRequestHeader("Range", rh);
	    },
            async: false,
            url: url,
            method: 'GET',
            dataType: 'text',
	});
	
	// convert
	r = convertdata(a.responseText);
	if(r.length == 0) break;
	if(r[0][0] == target) return point;
	if(r[0][0] > target) end=point;
	if(r[0][0] < target) start=point;
    }
    return start;
}

$(function () {
    // shorthand for: $(document).ready(callback)
    
    var options = {
        lines: { show: true },
//        points: { show: true },
        xaxis: {  axisLabelUseCanvas:true, axisLabel: 'Datum', min: Date.now() - 100000000, max: Date.now()-0, mode: "time", timeformat: "%d/%m %h:%M" },
        yaxes: [ { axisLabelUseCanvas:true, axisLabel: 'Temperatur C' , position: 'right'}, { axisLabelUseCanvas:true, axisLabel: 'Relativ luftfuktighet', position: 'left' } ],
	legend: { position: 'nw' },
        pan: {
            interactive: true
        }
    };
    var data = [];
    var placeholder = $("#placeholder");

    document.cookie = "temperature=20; max-age=" + 60*60*24*365;
    
    $.plot(placeholder, data, options);
    
    // fetch one series, adding to what we got
    var alreadyFetched = {};
    
    $("input.fetchSeries").click(function () {
        var button = $(this);
        var a;
	
        // find the URL in the link right next to us 
        var dataurl = "sensor.dat";
	
        // then fetch the data with jQuery
        function onDataReceived(rawseries, status, xhr) {
            // extract the first coordinate pair so you can see that
            // data is now an ordinary Javascript object
            var arr, i, step;
            var firstcoordinate;
	    var sensordat = { };
	    sensordat["sensors"] = [ ];
	    sensordat["series"] = [ ];

	    insertdata(rawseries, sensordat);
	    data = [];
	    for(i=0;i<sensordat["series"].length;i++) {
		var series = { };
		series.label = sensordat["series"][i];
		series.data = sensordat[sensordat["series"][i]];
		if(sensordat[sensordat["series"][i]]) {
		    if(sensordat[sensordat["series"][i]].yaxis) {
			series.yaxis = sensordat[sensordat["series"][i]].yaxis;
		    }
		}
		data.push(series);
	    }

//            button.siblings('span').text('Fetched ' + series.label + ', first point: ' + firstcoordinate);
//            button.siblings('span').text(' Last reading ' + series.label + ': ' + series.data[series.data.length-1][1]);
	    
            
            // and plot all we got
	    options.xaxis = {  axisLabelUseCanvas:true, axisLabel: 'Datum', min: Date.now() - 100000000, max: Date.now()-0, mode: "time", timeformat: "%d/%m %h:%M" };
            $.plot(placeholder, data, options);
        }
        
	a = $.ajax({
            url: dataurl,
            method: "HEAD",
            async: false,
            dataType: 'text'
        });
	var datasize = a.getResponseHeader('Content-Length');

//	start = binarysearch(dataurl, Date.now() - 100000000, 0, datasize-0);
	start = binarysearch(dataurl, Date.now() - 100000000, 0, datasize-0);
	console.log("starting at " + start);
	
        a = $.ajax({
	    beforeSend: function(xhrObj){
		var rh;
		rh = "bytes=" + start + "-" + datasize;
		xhrObj.setRequestHeader("Range", rh);
	    },
            url: dataurl,
            method: 'GET',
            dataType: 'text',
            success: onDataReceived
        });
    });
    
    
    // initiate a recurring data update
    $("input.dataUpdate").click(function () {
        // reset data
        data = [];
        alreadyFetched = {};
        
        $.plot(placeholder, data, options);
	
        var iteration = 0;
        
        function fetchData() {
            ++iteration;
	    
            function onDataReceived(series) {
                // we get all the data in one go, if we only got partial
                // data, we could merge it with what we already got
                data = [ series ];
                
                $.plot($("#placeholder"), data, options);
            }
            
            $.ajax({
                // usually, we'll just call the same URL, a script
                // connected to a database, but in this case we only
                // have static example files so we need to modify the
                // URL
                url: "data-eu-gdp-growth-" + iteration + ".json",
                method: 'GET',
                dataType: 'json',
                success: onDataReceived
            });
            
            if (iteration < 5)
                setTimeout(fetchData, 1000);
            else {
                data = [];
                alreadyFetched = {};
            }
        }
	
        setTimeout(fetchData, 1000);
    });
});
