function addItem(s) {
    $('#items').prepend('<tr>' + s + '</tr>');
}

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

    if(temp !== undefined) { 
	if(!sensordat[ sensorid + "-temp" ]) {
	    sensordat[ sensorid + "-temp" ] = [ ];
	    sensordat[ "sensors" ].push(sensorid);
	    sensordat[ "series" ].push(sensorid+"-temp");
	    sensordat[ "series" ].push(sensorid+"-rh");
	    sensordat[ "series" ].push(sensorid+"-rssi");
	    sensordat[ "series" ].push(sensorid+"-vmcu");
	    sensordat[ sensorid + "-temp" ].yaxis = 1;
	}
	if(sensordat[ sensorid + "-temp" ].length == 0)
	    sensordat[ sensorid + "-temp" ].push( [ tim, temp ] );
	else {
	    if( Math.abs(sensordat[ sensorid + "-temp" ][sensordat[ sensorid + "-temp" ].length-1][1] - temp) > 0.2)
		sensordat[ sensorid + "-temp" ].push( [ tim, temp ] );
	}
    }
    if(rh !== undefined) { 
	if(!sensordat[ sensorid + "-rh" ]) {
	    sensordat[ sensorid + "-rh" ] = [ ];
	    sensordat[ sensorid + "-rh" ].yaxis = 2;
	}
	if(sensordat[ sensorid + "-rh" ].length == 0)
	    sensordat[ sensorid + "-rh" ].push( [ tim, rh ] );
	else {
	    if( Math.abs(sensordat[ sensorid + "-rh" ][sensordat[ sensorid + "-rh" ].length-1][1] - rh) > 0.2)
		sensordat[ sensorid + "-rh" ].push( [ tim, rh ] );
	}
    }
    if(rssi !== undefined) { 
	if(!sensordat[ sensorid + "-rssi" ])
	    sensordat[ sensorid + "-rssi" ] = [ ];
	if(sensordat[ sensorid + "-rssi" ].length == 0)
	    sensordat[ sensorid + "-rssi" ].push( [ tim, rssi ] );
	else {
            if( Math.abs(sensordat[ sensorid + "-rssi" ][sensordat[ sensorid + "-rssi" ].length-1][1] - rssi) > 0.2)
		sensordat[ sensorid + "-rssi" ].push( [ tim, rssi ] );
	}
    }
    if(vmcu !== undefined) { 
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

function onDataReceived(data, text) {
    data["sensors"] = [ ];
    data["series"] = [ ];

    insertdata(text, data);
    while($('#items tr').length > 0) {
        $('#items').children().eq(0).remove();
    }
    for(i=0;i<data["series"].length;i++) {
        var series = { };
	try {
            series.label = data["series"][i];
            series.data = data[data["series"][i]];
            addItem('<td>' + new Date(series.data[series.data.length-1][0]) + "</td><td>" + series.label + "</td><td>" + series.data[series.data.length-1][1]+"</td>"); }
	catch(err) { }; 
    }
}

$(function () {
    // shorthand for: $(document).ready(callback)

    var dataurl = "sensor.dat";    
    var data = [];

    a = $.ajax({
        beforeSend: function(xhrObj){
            var rh;
            rh = "bytes=0-2";
            xhrObj.setRequestHeader("Range", rh);
        },
        url: dataurl,
        method: "GET",
        async: false,
        dataType: 'text'
    });
    var datasize = parseInt(a.getResponseHeader('Content-Range').split('/')[1]);

    start = datasize - 10000;
    
    $.ajax({
        beforeSend: function(xhrObj){
            var rh;
            rh = "bytes=" + start + "-" + datasize;
            xhrObj.setRequestHeader("Range", rh);
        },
        url: dataurl,
        method: 'GET',
        dataType: 'text',
        success: function(text, status, xhr) { onDataReceived(data, text); }
    });

});
