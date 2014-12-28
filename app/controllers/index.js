var moment = require('alloy/moment');
var Q = require('q');

function doClick(e) {
    updateAllInformation();
}

$.index.open();


var httpRequest = (function(){
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

	return function(args) {
		var defer, tiHttpClient;
		var url = args.url;
		var data = args.data;
		var method = args.method || 'GET';
		var headers = args.headers;
		
		defer = Q.defer();
	
	
		tiHttpClient = Ti.Network.createHTTPClient({
			onload: function() {
				var parsedData, error;
				if (this.status >= 200 && this.status < 300) {
					try { parsedData = JSON.parse(this.responseText); }
					catch (e) { error = e; }
				}
				else {
					error = "Bad HTTP Code";
				}
				if (error) {
					defer.reject({
						status:  this.status,
						message: error
					});
				}
				else {
					defer.resolve({
						status:  this.status,
						data: parsedData
					});
				}
			},
			onerror: function() {
				defer.reject({
					status:  this.status,
					message: this.responseText
				});
			},
			onsendstream: function(e) {
				defer.notify(e);
			},
			timeout: 1000
		});
	
	
		if(method == 'GET' && data){
			url = encodeData(data,url);
		}
		
		tiHttpClient.open(method, url, true);
		
		_.each(headers,function(value,key){
			tiHttpClient.setRequestHeader(key,value);
		});
		tiHttpClient.send(method == 'POST'?data:null);
	
		return defer.promise;
	};
})();



/*
 
weatherStatusCode
날씨 Context 중 상태 코드 알수 없음 : 0 맑음 : 1 흐림 : 2 안개 : 3 구름 : 4 비 : 5 눈 : 6 비/눈 : 7 폭우 : 8 폭설 : 9 폭우/폭설 : 10
weatherStatusDescription

weatherModifyCode
날씨 Context 중 수식 코드 알수 없음 : 0 강추위(한파) : 1 춥다 : 2 쌀쌀하다 : 3 포근하다 : 4 따듯하다 : 5 선선하다 : 6 덥다 : 7 무더위(폭염) : 8
weatherModifyDescription
 */



function getCurrentPosition() {
	var data = "",
	    defer = Q.defer();
	Ti.Geolocation.getCurrentPosition(function(e){
		if(e.success){
			defer.resolve(e);
		}else{
			defer.reject("GEO ERROR: " + e.code + ', ' +e.error);
		}
	});
	
	return defer.promise;
}

function updateAllInformation(){
	getCurrentPosition().then(function(e){
		updateWeather(e);
		updateWeatherStatus(e);
		updateLandmarkName(e);
	});
}

function updateWeather(e){
	//$.label.text = "확인중...";
	$.updateInfo.text = '';
	
	httpRequest({
		url : 'https://apis.sktelecom.com/v1/weather/status',
		method : 'GET',
		data : {
			latitude : e.coords.latitude,
			longitude : e.coords.longitude
		},
		headers : {
			'TDCProjectKey' : '2045a1d8-0ff7-46f3-b0e6-ae608ddd25dd',
			'Accept' : 'application/json'
		}
	}).then(function(result){
		
		$.modifyDesc.text = result.data.weatherModifyDescription;
		$.statusDesc.text = result.data.weatherStatusDescription;
		
		getFlickrPhotos({text : result.data.weatherModifyDescription, targetProxy : $.modifyDescImage});
		getFlickrPhotos({text : result.data.weatherStatusDescription, targetProxy : $.statusImage});
		
		$.updateInfo.text = moment().format('llll');
	});
}

function updateLandmarkName(e){
	
	httpRequest({
		url : 'https://apis.sktelecom.com/v1/zonepoi/pois',
		method : 'GET',
		data : {
			latitude : e.coords.latitude,
			longitude : e.coords.longitude
		},
		headers : {
			'TDCProjectKey' : '2045a1d8-0ff7-46f3-b0e6-ae608ddd25dd',
			'Accept' : 'application/json'
		}
	}).then(function(result){
		console.log(result);
		var landmarkname = result.data.results[0].name;
		$.landmark.text = landmarkname;
		console.log(result.data);
		//getFlickrPhotos({text : landmarkname.replace(/\((.*)?\)/,''), targetProxy : $.landmarkImage});
	}).catch(function(e){
		// alert(e);
	});
}

function updateWeatherStatus(e){
	// ref :  https://developers.skplanetx.com/apidoc/kor/weather/information/#doc1168
	httpRequest({
		url : 'http://apis.skplanetx.com/weather/current/minutely',
		method : 'GET',
		data : {
			version : '1',
			lat : e.coords.latitude,
			lon : e.coords.longitude
		},
		headers : {
			'appKey' : 'ea5b6542-e779-3fad-836d-a8e760539fe3',
			'Accept' : 'application/json'
		}
	}).then(function(result){
		var mData = result.data.weather.minutely[0];
		var precipitationTexts = ["없음", "비", "비/눈", "눈"];
		
		$.status.text = JSON.stringify(mData,null, '  ');
		// $.status.text = String.format("바람 : %sms \n강수 : %s, \n기온 : %s도 ( %s ~ %s ) \n습도 : %s%%",
			// mData.wind.wspd,
			// precipitationTexts[parseInt(mData.precipitation.type)],
			// mData.temperature.tc,
			// mData.temperature.tmin,
			// mData.temperature.tmax,
			// mData.humidity
		// );
	});
}

updateAllInformation();
Ti.App.addEventListener('resume', updateAllInformation);

function getFlickrPhotos(args){
	args = args || {};
	
	httpRequest({
		url : 'https://api.flickr.com/services/rest/',
		method : 'GET',
		data : {
			method : 'flickr.photos.search',
			api_key : '3daf938f07bf4146d6a416260a5737b1',
			text : args.text,
			format : 'json',
			nojsoncallback : 1
		},
		headers : {
			'Accept' : 'application/json'
		}
	}).then(function(result){
		var photo = result.data.photos.photo[_.random(0,result.data.photos.photo.length)];
		
		if(photo && photo.farm)
		{
			args.targetProxy && (args.targetProxy.image = 'http://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_n.jpg');
		}
	});
}
