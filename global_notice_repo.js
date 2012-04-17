/**
 * Global Notice Repository
 */
var config = require('./config.js');
var redisHost = config.redis_host;
var port = config.redis_port;

var redis = require("redis"), client = redis.createClient(port, redisHost);

client.on("error", function(err) {
	console.log("Redis Error " + err);
});

var GlobalNoticeRepo = {
	NOTIFY_GLOBAL_NOTICE_REPO : 'NS_GNR_',
	EXPIRE_TIME : 36000,
	/**
	 * put the notice message into the notice repository
	 */
	putNotice : function(topic, notice) {
		console.log("GlobalNoticeRepo - putNotice: " + topic);
		var noticeStr = JSON.stringify(notice);
		console.log("put notice to global notice repo - topic: " + topic + " notice: " + noticeStr);
		try {
			client.rpush(GlobalNoticeRepo.NOTIFY_GLOBAL_NOTICE_REPO + topic,
					noticeStr);
			client.expire(GlobalNoticeRepo.NOTIFY_GLOBAL_NOTICE_REPO + topic,
					GlobalNoticeRepo.EXPIRE_TIME);
		} catch (e) {
			console.log("Exception: " + e.name + "\n" + e.message);
			console.trace();
		}
	},

	removeNoticeList : function(topic) {
		try {
			client.del(GlobalNoticeRepo.NOTIFY_GLOBAL_NOTICE_REPO + topic);
		} catch (e) {
			console.log(e.message);
		}
	},

	getNoticeList : function(topic, callback) {
		try {
			client.lrange(GlobalNoticeRepo.NOTIFY_GLOBAL_NOTICE_REPO + topic,
					0, -1, callback);
		} catch (e) {
			console.log(e.message);
		}
	},
	/**
	 * package the notices in the list to json object
	 */
	packageNoticeRepo : function(topic, callback) {
		GlobalNoticeRepo.getNoticeList(topic, function(err, list) {
			try {
				var pack = null;
				if (list) {
					var nl = new Array();
					for (var i = 0; i < list.length; i++) {
						var notice = JSON.parse(list[i]);
						nl[nl.length] = notice;
					}
					pack = {
						'notice_list' : nl
					};
				}
				if (callback && typeof callback === 'function') {
					callback(pack);
				}
			} catch (e) {
				console.log(e.message);
			}
		});
	}

};

exports.putNotice = GlobalNoticeRepo.putNotice;
exports.removeNoticeList = GlobalNoticeRepo.removeNoticeList;
exports.packageNoticeRepo = GlobalNoticeRepo.packageNoticeRepo;