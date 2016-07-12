/**
* Auth Bearer module which is using token interceptor strategy to communicate with server.
*
* TODO :- 
*		v.0.1.3 User can customize $broadcast events as well. 
*		v.0.1.4 dynamic functions in $auth instead of just login logout e.t.c
*		v.0.1.5 Hook custom status codes not only 401
*
**/
var mod = angular.module('ng-enoa-auth', []);
mod.config(['$httpProvider',function($httpProvider) { $httpProvider.interceptors.push('TokenInterceptor'); }]);
mod.provider("$authConfig", function () {
	var _DATA = {
	  _PREFIX: 'enoa'
	  , _KEY: 'ng-auth'
	  , _TOKEN: 'ng-auth-token'

	  , headerKey: 'Authorization'
	  , headerPrefix: 'Bearer '
	  , onAuthFail: angular.noop
	};
	function reset(){
		_DATA.key = _DATA._PREFIX+':'+_DATA._KEY;
		_DATA.token = _DATA._PREFIX+':'+_DATA._TOKEN;
	} reset();

  return {
    setKey: function (key) { _DATA._KEY = key; reset(); },
    setToken: function (token) { _DATA._TOKEN = token; reset(); },
    setPrefix: function (prefix) { _DATA._PREFIX = prefix; reset();},
    setAuthFail: function (fun) { if(typeof fun == 'function') _DATA.onAuthFail = fun; else console.log('Usage:setAuthFail parameter must be a function'); },
    setHeaderKey: function (token) { _DATA.headerKey = token; },
    setHeaderPrefix: function (prefix) { _DATA.headerPrefix = prefix; },
    $get: function () { return _DATA; }
  };
});

mod.factory('$auth', ['$rootScope', '$authConfig', 'store', function($rootScope, $authConfig, store){
	return {

		user: store.getObject($authConfig.key, false)
		, token: store.get($authConfig.key, false)
		
		, logout : function(userObj){ 
			store.remove($authConfig.token); store.remove($authConfig.key); 
			this.user = this.token = false;
			$rootScope.$broadcast('ng-auth-bearer:logout', userObj);
		}
		, login: function(userObj, token){
			if(token){ this.token = token; store.set($authConfig.token, token); }
			if(userObj){ this.user = userObj; store.set($authConfig.key, userObj); }

			$rootScope.$broadcast('ng-auth-bearer:login', userObj);
		}
		, isLoggedin:function(){ return !!this.token; }

	}
}]);

mod.factory('store', ['$window', function($window){
	return {
		set:function (key, value) {
			if((typeof value === 'object' && value != null) || Array.isArray(value) ) value = JSON.stringify(value);
			$window.localStorage[key] = value;
		}
		, remove: function(key){ $window.localStorage.removeItem(key); }
		, get: function(key, defaultValue) { return $window.localStorage[key] || defaultValue; }
		, getObject: function(key, defaultValue){

			var value = $window.localStorage[key];
			if(!value) value = (defaultValue != undefined) ? defaultValue : {};
			return JSON.parse(value);
		}
	};
}]);

mod.factory('TokenInterceptor', ['$q','$auth', '$authConfig'
  ,function ($q, $auth, $authConfig) {
    return {
      request: function (config) {
        config.headers = config.headers || {};
        if ($auth.token){
            config.headers[$authConfig.headerKey] = $authConfig.headerPrefix+$auth.token;
        }
        return config;
      },
      requestError: function(rejection) {return $q.reject(rejection);},
      response: function (response) { return response || $q.when(response); },
      responseError: function(rejection) { 
        if(rejection.status == 401) $authConfig.onAuthFail(rejection);
        return $q.reject(rejection); 
      }
    };
}]);