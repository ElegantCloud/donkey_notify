/**
 * Notice Handlers
 */
var subManager = require('./subscriber_manager');
var globalRepo = require('./global_notice_repo');
var noticeQueue = require('./notice_queue');

var topicList = new Array();

var Handler = {
	onSubscribe : function(socket, data, fn) {
		try {
			var topic = data.topic;
			var subscriberID = data.subscriber_id;

			if (!topic || !subscriberID) {
				socket.emit("error", {
					status : 500,
					cmd : 'subscribe',
					msg : 'bad request'
				});
				return;
			}

			socket.topic = topic;
			socket.subscriberID = subscriberID;
			var slist = topicList[topic];
			if (slist) {
				socket.index = slist.push(socket) - 1;
			} else {
				slist = topicList[topic] = [ socket ];
				socket.index = 0;
			}

			subManager
					.contains(
							topic,
							subscriberID,
							function(isContain) {
								if (isContain) {
									// subscriber contains in the list
									console.log("subscriber " + subscriberID
											+ " exists in the list of topic "
											+ topic);
									// check the notice queue
									noticeQueue
											.packAllNoticesFromQueue(
													topic,
													subscriberID,
													function(pack) {
														if (pack) {
															console
																	.log("send cached message to subscriber: "
																			+ subscriberID); // @test
															socket.emit(
																	'notice',
																	pack);
														}
													});
								} else {
									// subscriber doesn't contain in the list,
									// add
									// to list
									console
											.log("subscriber "
													+ subscriberID
													+ " doesn't exist in the list of topic "
													+ topic);
									subManager.putSubscriber(topic,
											subscriberID);

									// send the notices in global notice
									// repository
									// to subscriber
									globalRepo
											.packageNoticeRepo(
													topic,
													function(pack) {
														if (pack) {
															console
																	.log("send global repo message to subscriber: "
																			+ subscriberID); // @test
															socket.emit(
																	'notice',
																	pack);
														}
													});
								}
							});

			// console.log("topic list len: " + topicList.length);
			console.log("topic " + topic + ' slist len: ' + slist.length);
		} catch (e) {
			console.log("Exception: " + e.message);
		}
	},
	onNotify : function(topic, msg) {
		try {
			// var msgJson = JSON.parse(msg);
			var msgList = [ msg ];
			var notice = {
				notice_list : msgList
			};

			var slist = topicList[topic];
			if (slist) {
				// send notice
				for ( var i = 0; i < slist.length; i++) {
					var socket = slist[i];
					console.log("send notice to " + socket.subscriberID);
					socket.emit('notice', notice);
				}
			}

			// put msg to global notice repo
			globalRepo.putNotice(topic, msg);
			// cache notice for off line subscribers
			Handler.cacheNotice(topic, msg);
		} catch (e) {
			console.log("Exception: " + e.name + "\n" + e.message);
			console.trace();
		}
	},
	onSocketNotify : function(socket, data, fn) {
		try {
			console.log("on socket notify");
			var topic = data.topic;
			var msg = data.msg; // json type
			console.log("notify - topic: " + topic + " msg: "
					+ JSON.stringify(msg));

			if (!topic || !msg) {
				socket.emit("error", {
					status : 500,
					cmd : 'notify',
					msg : 'bad request'
				});
				return;
			}
			Handler.onNotify(topic, msg);
		} catch (e) {
			console.log("Exception: " + e.name + "\n" + e.message);
			console.trace();
		}
	},
	onPostNotify : function(request, response) {
		try {
			console.log("on post notify");
			var topic = request.body.topic;
			var message = request.body.msg; // string type

			console.log('topic : ' + topic);
			console.log('message : ' + message);

			if (!topic || !message) {
				var res = {
					status : 500,
					cmd : 'notify',
					msg : 'bad request'
				};
				response.send(JSON.stringify(res));
			} else {
				var res = {
					status : 200,
					cmd : 'notify',
					msg : 'ok'
				};
				response.send(JSON.stringify(res));
				var msgJson = JSON.parse(message);
				Handler.onNotify(topic, msgJson);
			}

		} catch (e) {
			console.log("Exception: " + e.name + "\n" + e.message);
		}
	},
	cacheNotice : function(topic, notice) {
		console.log("cache notice for topic " + topic);
		try {
			var slist = topicList[topic];
			if (slist) {
				subManager.getSubscriberList(topic, function(err, list) {
					if (list) {
						for ( var j = 0; j < list.length; j++) {
							var isSocketExist = false;
							for ( var i = 0; i < slist.length; i++) {
								var subscriberID = slist[i].subscriberID;
								if (list[j] == subscriberID) {
									isSocketExist = true;
									break;
								}
							}
							if (!isSocketExist) {
								// cache the notice
								console.log("cache notice for subscriber "
										+ list[j]);
								noticeQueue.set(topic, list[j], notice);
							}
						}
					}
				});
			}
		} catch (e) {
			console.log(e.message);
		}
	},
	onGetAll : function(socket, data, fn) {
		try {
			console.log("on getting all notices");
			var topic = data.topic;

			if (!topic) {
				socket.emit("error", {
					status : 500,
					cmd : 'getall',
					msg : 'bad request'
				});
				return;
			}

			globalRepo.packageNoticeRepo(topic, function(pack) {
				if (pack) {
					console.log("send global repo message to subscriber: "
							+ subscriberID); // @test
					socket.emit('notice', pack);
				}
			});
		} catch (e) {
			console.log(e.message);
		}
	},
	onDisconnect : function(socket) {
		try {
			var topic = socket.topic;
			var slist = topicList[topic];
			console.log("topic: " + topic + " subscriber: "
					+ socket.subscriberID);
			if (slist) {
				slist.splice(socket.index, 1);
				if (slist.length <= 0) {
					console.log("delete topic : " + topic);
					delete topicList[topic];
				}
			}
		} catch (e) {
			console.log(e.message);
		}
	}
};

exports.onSubscribe = Handler.onSubscribe;
exports.onPostNotify = Handler.onPostNotify;
exports.onSocketNotify = Handler.onSocketNotify;
exports.onDisconnect = Handler.onDisconnect;
exports.onGetAll = Handler.onGetAll;
