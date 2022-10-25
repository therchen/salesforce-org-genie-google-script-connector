var Client_Id = '3MVG9JEx.BE6yifNS6d9p7aKM3qwh0ygIVo8oAM2qC4OHQIb4TmmOttII8OIZJFBKEuWMhl0vPrVDp6sYzyl4';
var Client_Secret = '341AD74BE5F1078B9A11ACC027633D078CA53C404FC3FD65904E93F3DC857C47';
var App_Name = 'Org Genie';
var Api_Version = 'v53.0';
var Group_Size = '250';
var loadash = Loadash.load();

function onInstall(e) {
	onOpen(e);
}

function onOpen(e) {
	SpreadsheetApp.getUi().createAddonMenu().addItem('Open', 'showSidebar').addToUi();
}

function authCallback(request) {
	var template = HtmlService.createTemplateFromFile('Callback');
	template.email = Session.getEffectiveUser().getEmail();
	template.isSignedIn = false;
	template.error = null;
	var title;
	try {
		var service = getService();
		var authorized = service.handleCallback(request);
		template.isSignedIn = authorized;
		title = authorized ? 'Access Granted' : 'Access Denied';
	} catch (e) {
		template.error = e;
		title = 'Access Error';
	}
	template.title = title;
	return template.evaluate().setTitle(title).setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function createReportFieldReplacementJob(oldFieldApiName, newFieldApiName) {
	var statement = 'SELECT Id FROM Report';
	var ids = getRecordIds(statement);
  //Logger.log(ids.length);
	if (ids && ids.length > 0) {
		var childGroups = loadash.chunk(ids, Group_Size);
		var childGroupIds = [];
		var currentChildGroupId = '';
		var parentGroupId = setParentGroupIdToQueue();
		childGroups.forEach(function(childGroup, index) {
			var childGroupId = Helper.generateUid();
			childGroupIds.push(childGroupId);
			if (index == 0) {
				currentChildGroupId = childGroupId;
			}
			var childGroupData = {
				'id': childGroupId,
				'status': 'New',
        'object': 'Report',
				'parentGroupId': parentGroupId,
        'oldFieldApiName': oldFieldApiName,
        'newFieldApiName': newFieldApiName,
				'ids': childGroup
			};
      Helper.set(childGroupId, childGroupData);
		});
		var parentGroupData = {
			'childGroupIds': childGroupIds,
			'currentChildGroupId': currentChildGroupId,
			'id': parentGroupId,
			'status': 'New',
			'type': 'replaceFieldInReports',
      'oldFieldApiName': oldFieldApiName,
      'newFieldApiName': newFieldApiName
		};
    Helper.set(parentGroupId, parentGroupData);
	}
}

function describeDashboard(id) {
	var service = getService();
	var response;
	if (service.hasAccess()) {
		var url = service.getToken().instance_url + '/services/data/' + Api_Version + '/analytics/dashboards/' + id + '/describe';
		response = run(service, url);
	}
	return response;
}

function describeReport(id) {
	var service = getService();
	var response;
	if (service.hasAccess()) {
		var url = service.getToken().instance_url + '/services/data/' + Api_Version + '/analytics/reports/' + id + '/describe';
		response = run(service, url);
	}
	return response;
}

function getAuthorizationUrl() {
	return getService().getAuthorizationUrl();
}

function getCurrentChildGroup(currentGroup){
  var currentChildGroup;
  if(currentGroup){
    currentChildGroup = Helper.get(currentGroup.currentChildGroupId);
  }
  return currentChildGroup;
}

function getRecordIds(statement) {
	var ids = [];
	var service = getService();
	if (service.hasAccess()) {
		var response = soqlQuery(statement);
		if (response) {
			if (response.totalSize > 0) {
				response.records.forEach(function(record) {
					ids.push(record.Id);
				});
				if (response.totalSize > 2000) {
					var numGroups = Number(response.totalSize / 2000).toFixed(0);
					var queryId = response.nextRecordsUrl.substring(response.nextRecordsUrl.indexOf('query/') + 6, response.nextRecordsUrl.length - 5);
					for (var i = 0; i < numGroups; i++) {
						var groupNum = (i + 1) * 2000;
						var url = service.getToken().instance_url + '/services/data/' + Api_Version + '/query/' + queryId + '-' + groupNum.toString();
						var groupResponse = run(service, url);
						if (groupResponse) {
							groupResponse.records.forEach(function(record) {
								ids.push(record.Id);
							});
						}
					}
				}
			}
		}
	}
	return ids;
}

function getCurrentGroup(){
  var currentGroup;
  var queue = Helper.get('queue');
  if(queue != null){
    currentGroup = Helper.get(queue.currentGroupId);
  }
  return currentGroup;
}

function getService() {
	return OAuth2.createService('Saleforce').setAuthorizationBaseUrl('https://login.salesforce.com/services/oauth2/authorize').setTokenUrl('https://login.salesforce.com/services/oauth2/token').setClientId(Client_Id).setClientSecret(Client_Secret).setCallbackFunction('authCallback').setPropertyStore(PropertiesService.getUserProperties()).setScope('full offline_access refresh_token');
}

function include(filename) {
	return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function logRedirectUri() {
	Logger.log(OAuth2.getRedirectUri());
}

function reset() {
	getService().reset();
}

function run(service, url) {
	var response = withRetry(service, function() {
		return UrlFetchApp.fetch(url, {
			muteHttpExceptions: true,
			headers: {
				Authorization: "Bearer " + service.getToken().access_token
			}
		});
	});
	if (response) {
		return JSON.parse(response);
	}
	return;
}

function patch(service, url, metadata) {
	var response = withRetry(service, function() {
		return UrlFetchApp.fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + service.getToken().access_token,
        'content-type': 'application/json'
			},
      'method': "patch",
      'payload': JSON.stringify(metadata)
		});
	});
	if (response) {
    //Logger.log(response);
		return JSON.parse(response);
	}
	return;
}

function patchReport(id, newMetadata) {
	var service = getService();
	var response;
	if (service.hasAccess()) {
		var url = service.getToken().instance_url + '/services/data/' + Api_Version + '/analytics/reports/' + id;
		response = patch(service, url, newMetadata);
	}
	return response;
}

/**
 * @param {Object} currentChildGroup The data to be set - JSON Object.
 */
function setChildGroupAsCompleted(currentChildGroup) {
	currentChildGroup.status = 'Completed';
  Helper.set(currentChildGroup.id, currentChildGroup);
}

function setChildGroupAsInProgress(currentGroup, nextChildGroup) {
	nextChildGroup.status = 'In Progress';
  Helper.set(nextChildGroup.id, nextChildGroup);
	currentGroup.currentChildGroupId = nextChildGroupId;
  Helper.set(currentGroup.id, currentGroup);
}

function setGroupAsCompleted(currentGroup) {
	currentGroup.status = 'Completed';
  Helper.set(currentGroup.id, currentGroup);
}

function setGroupAsInProgress(queue, nextGroup) {
	nextGroup.status = 'In Progress';
  Helper.set(nextGroup.id, nextGroup);
	queue.currentGroupId = nextGroup.id;
  Helper.set('queue', queue);
}

function setNextChildGroup(currentGroup, currentChildGroup) {
	if (currentGroup != null && currentChildGroup != null) {
		setChildGroupAsCompleted(currentChildGroup);
		var childGroupIds = currentGroup.childGroupIds;
		var currentIndex = childGroupIds.indexOf(currentChildGroup.id);
		var nextIndex = currentIndex + 1;
		if (nextIndex == childGroupIds.length) {
			Logger.log('No More Child Groups');
			setGroupAsCompleted(currentGroup);
			setNextGroup(currentGroup);
		} else {
			Logger.log('More Child Groups');
			var nextChildGroupId = childGroupIds[nextIndex];
      var nextChildGroup = Helper.get(nextChildGroupId);
			setChildGroupAsInProgress(currentGroup, nextChildGroup);
		}
	}
}

function setNextGroup(currentGroup){
  var queue = Helper.get('queue');
  if(queue != null){
    var groupIds = queue.groupIds;
    var currentIndex = groupIds.indexOf(currentGroup.id);
    var nextIndex = currentIndex + 1;
    if(nextIndex == groupIds.length){
      Logger.log('No More Groups');
      setQueueToEmpty(queue);
    }
    else{
      Logger.log('More Groups');
      var nextGroupId = groupIds[nextIndex];
      var nextGroup = Helper.get(nextGroupId);
      setGroupAsInProgress(queue, nextGroup);
    }
  }
}

function setParentGroupIdToQueue(){
    var queue = Helper.get('queue');
    var parentGroupId = Helper.generateUid();
    if(queue != null){
      if(queue.currentGroupId == null){
        queue.currentGroupId = parentGroupId;
      }
    }
    else{
      queue = {
        currentGroupId: parentGroupId,
        groupIds: []
      };
    }
    queue.groupIds.push(parentGroupId);
    Helper.set('queue', queue);
    //Logger.log(queue);
    return parentGroupId;
}

function setQueueToEmpty(queue) {
	queue.currentGroupId = null;
	queue.groupIds = [];
  Helper.set('queue', queue);
}

function showSidebar() {
	var service = getService();
	var template = HtmlService.createTemplateFromFile('Sidebar');
	template.email = Session.getEffectiveUser().getEmail();
	template.isSignedIn = service.hasAccess();
	var page = template.evaluate().setTitle(App_Name);
	SpreadsheetApp.getUi().showSidebar(page);
}

function signOut() {
	getService().reset();
}

function soqlQuery(statement) {
	var service = getService();
	var response;
	if (service.hasAccess()) {
		var url = service.getToken().instance_url + '/services/data/' + Api_Version + '/query?q=' + encodeURIComponent(statement);
		response = run(service, url);
	}
	return response;
}

function withRetry(service, func) {
	var response;
	var code;
	try {
		response = func();
		code = response.getResponseCode();
	} catch (e) {
		content = e.toString();
	}
	if (code == 401) {
		service.refresh();
		return func();
	}
	return response;
}
