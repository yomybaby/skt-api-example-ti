var moment = require('alloy/moment');
function doClick(e) {
    updateWeather();
}

$.index.open();

function encodeData(obj, url) {
	var str = [];
	for (var p in obj) {
		str.push(Ti.Network.encodeURIComponent(p) + "=" + Ti.Network.encodeURIComponent(obj[p]));
	}

	if (_.indexOf(url, "?") == -1) {
		return url + "?" + str.join("&");
	} else {
		return url + "&" + str.join("&");
	}
}


/*
 
weatherStatusCode
날씨 Context 중 상태 코드 알수 없음 : 0 맑음 : 1 흐림 : 2 안개 : 3 구름 : 4 비 : 5 눈 : 6 비/눈 : 7 폭우 : 8 폭설 : 9 폭우/폭설 : 10
weatherStatusDescription

weatherModifyCode
날씨 Context 중 수식 코드 알수 없음 : 0 강추위(한파) : 1 춥다 : 2 쌀쌀하다 : 3 포근하다 : 4 따듯하다 : 5 선선하다 : 6 덥다 : 7 무더위(폭염) : 8
weatherModifyDescription
 */

function updateWeather(){
	//$.label.text = "확인중...";
	$.updateInfo.text = '';
	
	Ti.Geolocation.getCurrentPosition(function(e){
		// Create an HTTPClient.
		var anXhr = Ti.Network.createHTTPClient();
		anXhr.setTimeout(10000);
		
		// Define the callback.
		anXhr.onload = function() {
			// Handle the XML data.
			var resultObj = JSON.parse(this.responseText);
			$.modifyDesc.text = resultObj.weatherModifyDescription;
			$.statusDesc.text = resultObj.weatherStatusDescription;
			
			getFlickrPhotos({text : resultObj.weatherModifyDescription, targetProxy : $.modifyDescImage});
			getFlickrPhotos({text : resultObj.weatherStatusDescription, targetProxy : $.statusImage});
			
			$.updateInfo.text = moment().format('llll');
		};
		anXhr.onerror = function(e) {
			alert(e);
		};
		
		// Send the request data.
		anXhr.open('GET',encodeData({
			latitude : e.coords.latitude,
			longitude : e.coords.longitude
		},'https://apis.sktelecom.com/v1/weather/status'));
			
		anXhr.setRequestHeader('TDCProjectKey','2045a1d8-0ff7-46f3-b0e6-ae608ddd25dd');
		anXhr.setRequestHeader('Accept','application/json');
		anXhr.send();
		
		
		updateWeatherStatus(e); //via sk planet api
		
		
		updateLandmarkName(e);
	});
}

function updateLandmarkName(e){
	var xhr = Ti.Network.createHTTPClient();
	xhr.setTimeout(10000);
	
	xhr.onload = function(e) {
		var resultObj = JSON.parse(this.responseText);
		
		var landmarkname = resultObj.results[0].name;
		$.landmark.text = landmarkname;
		
		getFlickrPhotos({text : landmarkname.replace(/\((.*)?\)/,''), targetProxy : $.landmarkImage});
	};
	
	xhr.onerror = function(e) {
		alert(e);
	};
	
	xhr.open('GET',encodeData({
		latitude : e.coords.latitude,
		longitude : e.coords.longitude
	},'https://apis.sktelecom.com/v1/zonepoi/pois'));
	xhr.setRequestHeader('TDCProjectKey','2045a1d8-0ff7-46f3-b0e6-ae608ddd25dd');
	xhr.setRequestHeader('Accept','application/json');
	xhr.send();
}

function updateWeatherStatus(e){
	// Create an HTTPClient.
	var planetXhr = Ti.Network.createHTTPClient();
	planetXhr.setTimeout(10000);
	
	// Define the callback.
	planetXhr.onload = function() {
		// Handle the XML data.
		var resultObj = JSON.parse(this.responseText);
		var mData = resultObj.weather.minutely[0];
		var precipitationTexts = ["없음", "비", "비/눈", "눈"];
		
		$.status.text = String.format("바람 : %sms \n강수 : %s, \n기온 : %s도 ( %s ~ %s ) \n습도 : %s%%",
			mData.wind.wspd,
			precipitationTexts[parseInt(mData.precipitation.type)],
			mData.temperature.tc,
			mData.temperature.tmin,
			mData.temperature.tmax,
			mData.humidity
		);
	};
	planetXhr.onerror = function(e) {
		alert(e);
	};
	
	// Send the request data.
	planetXhr.open('GET',encodeData({
		version : '1',
		lat : e.coords.latitude,
		lon : e.coords.longitude
	},'http://apis.skplanetx.com/weather/current/minutely'));
	planetXhr.setRequestHeader('appKey','ea5b6542-e779-3fad-836d-a8e760539fe3');
	planetXhr.setRequestHeader('Accept','application/json');
	planetXhr.send();
}

updateWeather();
Ti.App.addEventListener('resume', function(e) {
	updateWeather();
});


function getFlickrPhotos(args){
	args = args || {};
	
	var xhr = Ti.Network.createHTTPClient();
	xhr.setTimeout(10000);
	
	xhr.onload = function(e) {
		var resultObj = JSON.parse(this.responseText);
		var photo = resultObj.photos.photo[_.random(0,resultObj.photos.photo.length)];
		
		args.targetProxy && (args.targetProxy.image = 'http://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_n.jpg');
		// alert($.statusImage.image);
	};
	
	xhr.onerror = function(e) {
		alert(e);
	};
	
	xhr.open('GET',encodeData({
		method : 'flickr.photos.search',
		api_key : '3daf938f07bf4146d6a416260a5737b1',
		text : args.text,
		format : 'json',
		nojsoncallback : 1
	},'https://api.flickr.com/services/rest/'));
	xhr.setRequestHeader('TDCProjectKey','2045a1d8-0ff7-46f3-b0e6-ae608ddd25dd');
	xhr.setRequestHeader('Accept','application/json');
	xhr.send();
}
