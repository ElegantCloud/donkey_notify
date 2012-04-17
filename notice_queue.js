/**
 * Notice Queue
 */
var config = require('./config.js');
var redisHost = config.redis_host;
var port = config.redis_port;

var redis = require("redis"), client = redis.createClient(port, redisHost);

client.on("error", function(err) {
	console.log("Redis Error " + err);
});

var NoticeQueue = {
	NOTIFY_NOTICE_QUEUE : 'NS_NQ_',
	EXPIRE_TIME : 36000,
	set : function(topic, subscriberID, notice) {
		try {
			var noticeStr = JSON.stringify(notice);
			var key = NoticeQueue.NOTIFY_NOTICE_QUEUE + topic + subscriberID;
			client.rpush(key, noticeStr);
			client.expire(key, NoticeQueue.EXPIRE_TIME);
		} catch (e) {
			console.log(e.message);
		}
	},

	deleteQueue : function(topic, subscriberID) {
		try {
			client.del(NoticeQueue.NOTIFY_NOTICE_QUEUE + topic + subscriberID);
		} catch (e) {
			console.log(e.message);
		}
	},

	/**
	 * package all cached notices from queue
	 */
	packAllNoticesFromQueue : function(topic, subscriberID, callback) {
		try {
			var key = NoticeQueue.NOTIFY_NOTICE_QUEUE + topic + subscriberID;
			client.lrange(key, 0, -1, function(err, list) {
				if (list) {
					var nl = new Array();
					for (var i = 0; i < list.length; i++) {
						var notice = JSON.parse(list[i]);
						nl[nl.length] = notice;
					}
					
					var pack = {
						'notice_list' : nl
					};
					if (callback && typeof callback === 'function') {
						callback(pack);
					}
					// remove the packaged cached notices
					var len = list.length;
					client.ltrim(key, len, -1);
				}
			});
		} catch (e) {
			console.log(e.message);
		}
	}
};

exports.set = NoticeQueue.set;
exports.deleteQueue = NoticeQueue.deleteQueue;
exports.packAllNoticesFromQueue = NoticeQueue.packAllNoticesFromQueue;