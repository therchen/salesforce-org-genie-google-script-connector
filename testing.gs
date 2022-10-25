var Client_Id = '3MVG9JEx.BE6yifNS6d9p7aKM3qwh0ygIVo8oAM2qC4OHQIb4TmmOttII8OIZJFBKEuWMhl0vPrVDp6sYzyl4';
var Client_Secret = '341AD74BE5F1078B9A11ACC027633D078CA53C404FC3FD65904E93F3DC857C47';
var Api_Version = 'v53.0';
var Group_Size = '25';
var loadash = Loadash.load();

function resetIt() {
	UserProperties.deleteAllProperties();
}

function testIt01() {
	var dashboardId = '01Z3t000000kGAEEA2';
	var metadata = describeDashboard(dashboardId);
	var components = metadata.components;
	components.forEach(function(component, index) {
		var reportId = component.reportId;
		var properties = component.properties;
		var filterColumns = properties.filterColumns;
		Logger.log(filterColumns);
		var groupings = properties.groupings;
		Logger.log(groupings);
	});
	/*
	var ids = ['00O3t000005vINvEAM'];
	var results = replaceFieldInReports(ids, 'Account', 'OldField__c', 'NewField__c');
	Logger.log(results);
  */
}
function replaceFieldInDashboards(oldEntityColumnName, newEntityColumnName, reportId) {
	var dashboardIds = getRecordIds('SELECT Id FROM Dashboard');
	if (dashboardIds != null && dashboardIds.length > 0) {
		dashboardIds.forEach(function(dashboardId, index) {
			var dashboardMetadata = describeDashboard(dashboardId);
			if (dashboardMetadata) {
				var components = dashboardMetadata.components;
				components.forEach(function(component, index) {
					if (component.reportId == reportId) {
						/*[{label=OldField, name=Account.OldField__c}]*/
						var filterColumns = component.properties.filterColumns;
						Logger.log(filterColumns);
						filterColumns.forEach(function(filterColumn, index) {
							//REPLACE
							if (filterColumn.name == oldEntityColumnName) {}
						});
						/*[{inheritedReportSort=null, sortAggregate=null, sortOrder=Asc, name=Account.OldField__c}]*/
						var groupings = component.properties.groupings;
						Logger.log(groupings);
						groupings.forEach(function(grouping, index) {
							//REPLACE
							if (grouping.name == oldEntityColumnName) {}
						});
					}
				});
				var oldDashboardString = JSON.stringify(dashboardMetadata);
				if (oldDashboardString.indexOf(id) > -1 && oldDashboardString.indexOf(id) > -1) {
					var dashboardResult = {};
					dashboardResult.developerName = dashboardMetadata.developerName;
					dashboardResult.folderId = dashboardMetadata.folderId;
					dashboardResult.id = dashboardId;
					dashboardResult.name = dashboardMetadata.name;
					dashboardResult.status = 'New';
				}
			}
			Logger.log(dashboardMetadata);
		});
	}
}

function replaceFieldInReports(ids, objectApiName, oldFieldApiName, newFieldApiName) {
	var oldEntityColumnName = objectApiName + '.' + oldFieldApiName;
	var newEntityColumnName = objectApiName + '.' + newFieldApiName;
	var oldEntityColumnNameExp = new RegExp(oldEntityColumnName + '[a-z]*', 'g');
	var results = [];
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		var metadata = describeReport(id);
		if (metadata) {
			var result = {};
			result.dashboards = [];
			result.developerName = metadata.reportMetadata.developerName;
			result.folderId = metadata.reportMetadata.folderId;
			result.id = id;
			result.name = metadata.reportMetadata.name;
			result.status = 'New';
			var oldString = JSON.stringify(metadata);
			if (oldString.indexOf(oldEntityColumnName) > -1) {
				var newString = oldString.replace(oldEntityColumnNameExp, newEntityColumnName);
				metadata = JSON.parse(newString);
				/*
				var response = patchReport(id, metadata);
				if (response) {
          result.status = 'Complete';
					results.push(result);
				}
        else{
          result.status = 'Incomplete';
					results.push(result);
        }
        */
			}
		}
	}
	return results;
}

function testIt() {
	var currentChildGroup;
	var currentGroup = getCurrentGroup();
	if (currentGroup != null) {
		currentChildGroup = getCurrentChildGroup(currentGroup);
		if (currentChildGroup != null) {
			var ids = currentChildGroup.ids;
			if (ids != null && ids.length > 0) {
				switch (currentGroup.type) {
					case ('replaceFieldInReports'):
						replaceFieldInReports(ids, currentChildGroup.oldFieldApiName, currentChildGroup.newFieldApiName);
				}
			}
		}
	}
}
