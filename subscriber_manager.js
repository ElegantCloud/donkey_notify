/**
 * Subscriber Manager
 */
var config = require('./config.js');
var redisHost = config.redis_host;
var port = config.redis_port;

var redis = require("redis"), client = redis.createClient(port, redisHost);

client.on("error", function(err) {
	console.log("Redis Error " + err);
});

var SubManager = {
	NOTIFY_SUBSCRIBER_PRE : 'NS_SUBER_',
	EXPIRE_TIME : 36000,
	/**
	 * put subscriber to redis
	 */
	putSubscriber : function(topic, subscriberID) {
		try {
			console.log("putSubscriber " + subscriberID + " in " + topic);
			client
					.rpush(SubManager.NOTIFY_SUBSCRIBER_PRE + topic,
							subscriberID);
			client.expire(SubManager.NOTIFY_SUBSCRIBER_PRE + topic,
					SubManager.EXPIRE_TIME);
		} catch (e) {
			console.log(e.message);
		}
	},

	getSubscriberList : function(topic, callback) {
		try {
			client.lrange(SubManager.NOTIFY_SUBSCRIBER_PRE + topic, 0, -1,
					callback);
		} catch (e) {
			console.log(e.message);
		}
	},

	/**
	 * check whether the subscriber is contained in the list according to the
	 * topic
	 */
	contains : function(topic, subscriberID, callback) {
		try {
			console.log("contains");

			client.lrange(SubManager.NOTIFY_SUBSCRIBER_PRE + topic, 0, -1,
					function(err, list) {
						console.log("list: " + list);
						if (list) {
							var exist = false;
							for ( var i = 0; i < list.length; i++) {
								var subscriber = list[i];
								console.log("subscriber: " + subscriber);
								if (subscriber == subscriberID) {
									exist = true;
									break;
								}
							}
							if (callback && typeof callback === 'function') {
								callback(exist);
							}
						}

					});
		} catch (e) {
			console.log(e.message);
		}
	},

	/**
	 * remove the subscribers in the map
	 */
	removeSubscriberList : function(topic) {
		try {
			client.del(SubManager.NOTIFY_SUBSCRIBER_PRE + topic);
		} catch (e) {
			console.log(e.message);
		}
	}
};

exports.putSubscriber = SubManager.putSubscriber;
exports.getSubscriberList = SubManager.getSubscriberList;
exports.contains = SubManager.contains;
exports.removeSubscriberList = SubManager.removeSubscriberList;