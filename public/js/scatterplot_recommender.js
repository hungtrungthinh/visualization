// Related videos modal
$("#relatedVideosModal").on("show.bs.modal", function(e) {
	//$(this).find(".modal-body").html('<table class="table" id="relatedVideosModalTable"><tbody></tbody></table>');
	var data = getRelatedVideos($(e.relatedTarget).attr("data-assessment"), $(e.relatedTarget).attr("data-question"));
	$("#relatedVideosModalTable tbody").empty();
	var tbody = d3.select("#relatedVideosModalTable tbody");
	var tr = tbody.selectAll("tr")
		.data(data)
		.enter()
		.append("tr")
		.attr("id", function(d) { return "videoRow"+d["Video ID"]; });

	tr.append("td")
		.html(function(d) { return d.chapter + "." + d.section + "." + d.group + "." + d.video; })
		.attr("class","videoRefCell");
	tr.append("td")
		// TODO absolute URL ref fix
		.html(function(d) { return '<a href="../consumer.php?app=ayamel&video_id=' + d["Video ID"] + '" data-track="ayamelLaunch' + d["Video ID"] + '" target="_blank">' + d.title + '</a>'; })
		.attr("class","videoTitleCell");
	// TODO put back in percentage watched, with actual data
	tr.append("td")
		.attr("class", "videoProgressCell advancedMore");
		//.append("input")
		//.attr("type", "text")
		//.attr("class", "progressCircle")
		//.attr("disabled", "disabled")
		//.attr("value", function() { return Math.ceil(Math.random() * 100); }); // TODO put actual percentage here
		
	// Track that the modal was shown
	track("clicked", "relatedVideos" + $(e.relatedTarget).attr('data-assessment') + '.' + $(e.relatedTarget).attr('data-question'));

	// Don't stall the UI waiting for all these to finish drawing
	setTimeout(updateVideoProgressCircles, 1);
	refreshView();
});

// Returns videos for a given question
function getRelatedVideos(assessmentId, questionId) {
	var relatedVideos = [];
	for (var i=0; i<mappings.length; i++) {
		// See if this question's quiz is associated with this video
		if (mappings[i]["Open Assessments ID"] == assessmentId) {
			relatedVideos.push(mappings[i]);
		}
	}
	return relatedVideos;
}

// Called when a concept in the left filter sidebar is clicked
function filterConceptClick(d) {
	// Make the currently active concept button not active
	$("#filterList .active").removeClass("active");
	// Then make this one active
	$(d3.event.currentTarget).addClass("active");
	// Track the click
	track("clicked","filterListConcept"+d.id);
	// Then load recommendations for the concept associated with the clicked concept button
	loadRecommendations("concept", d.id);
	// Scroll to the top of the page so recommendations are visible
	$("html, body").animate({ scrollTop: 0 }, "fast");
}

// Loads scores for all concepts, which are used in the filter navigation sidebar
function loadConceptScores() {
	$("#filterSection .spinner").show();
	$("#filterLoadingContainer").hide();
	// Get the list of all concepts and their scores
	d3.json("../scatterplot_recommender_stats/masteryGraph/all/all", function(error, data) {
		$("#filterSection .spinner").hide();
		$("#filterLoadingContainer").show();

		// Some basic error handling
		if (!(data && typeof data == 'object') || error) {
			$("#filterLoadingContainer").html('<p class="lead">There was an error loading concept scores. Try reloading the dashboard.</p>');
			return;
		}

		//Color scale
		var colorScale = d3.scale.linear()
				.domain([0, 3.3, 6.6, 10])
				.range(["#d9534f", "#FFCE54", "#D4D84F", "#5cb85c"]);
		
		// Remove any existing concepts
		$("#filterList .filterListConcept").remove();

		//Create tooltips
		var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return "Score: " + d.score + ". Click to view recommendations."; });

		// Create element for each concept
		var conceptList = d3.select("#filterList");
		var concepts = conceptList.selectAll(".filterListConcept")
			.data(data)
			.enter()
			.append("a")
			.on("click", filterConceptClick)
			.attr("data-toggle", "tooltip")
			.attr("data-placement", "right")
			.attr("title", function(d) { return "Score: " + d.score; })
			.attr("class", function(d) { return "filterListConcept unit" + d.unit + "Concept"; });
		
		var labels = concepts.append("div")
			.attr("class", "filterListItemText")
			.html(function(d) { return d.id + ' ' + d.display; });

		// Progress bar-like display at bottom of each concept that shows mastery score
		var rects = concepts.append("span")
			.attr("class", "conceptProgressBar")
			.style("width", 0)//function(d) { return Math.max(4, d.score * 10) + "%"; })
			//.style("background-color", function(d) { return d.score >= 6 ? "#5cb85c" : d.score >= 4 ? "#f0ad4e" : "#d9534f"; })
			.style("background", function(d) { return colorScale(d.score); });

		// Set up click handler for special unit list item (and show it, since it's hidden for load)
		$(".filterListUnit").removeClass("hidden").click(function() {
			$("#filterList .active").removeClass("active");
			$(this).addClass("active");
			var selectedUnit = $("[name=filterUnitSelector]").val();
			track("clicked","filterListUnit"+selectedUnit+"AllConcepts");
			loadRecommendations("unit", selectedUnit);
		});
					
		animateConceptScores();
		setupBootstrapTooltips();
		// Now we've got all concepts. Filter to current unit by default
		filterConceptList();
	});
}

// Helper function for recommendation question elements. Contains question/concept display, launch quiz button, and see associated videos button
function questionElement(d) {
	// Get the template
	var element = $("#templates .recommendQuestionDisplay")[0].outerHTML;
	// Put our data values into it (this is a basic template idea from http://stackoverflow.com/a/14062431 )
	$.each(d, function(k, v) {
		var regex = new RegExp("{" + k + "}", "g");
		element = element.replace(regex, v);
	});
	return element;
}

// Loads recommendations
function loadRecommendations(scopeOption, scopeGroupingId) {
	$("#recommendSection .spinner").show();
	$("#recommendContainer").hide();
	// Get scope with capital first letter for displaying
	var scopeOptionName = scopeOption.charAt(0).toUpperCase() + scopeOption.slice(1);
	$("#recommendationHeaderScopeLabel").text(scopeOptionName + " " + scopeGroupingId);

	// Get question recommendations for our scope and grouping ID (either unit number or concept number)
	d3.json("../scatterplot_recommender_stats/recommendations/" + scopeOption + "/" + scopeGroupingId, function(error, data) {
		$("#recommendSection .spinner").hide();
		$("#recommendContainer").show();
		if (!(data && typeof data == 'object' && "group1" in data) || error) {
			$("#recommendContainer").html('<br><br><p class="lead">There was an error loading recommendations. Try reloading the dashboard.</p>');
			return;
		}
		for (var i=1; i<5; i++) {
			$("#recommend"+i+"List").empty();
			d3.select("#recommend"+i+"List")
				.selectAll("tr")
				.data(data["group"+i])
				.enter()
				.append("tr")
				.attr("class", "advancedSimple")
				.html(function(d) { return questionElement(d); });
			$("#recommend"+i+"List").prepend($("#templates .recommendHeaderTemplate").clone());
			$("[aria-controls=recommend"+i+"] .countBadge").text(data["group"+i].length);
		}
		// Set up sticky table headers
		setupStickyHeaders();
		// Set up the show more/show less for the question texts
		$(".recommendQuestionTextContainer").shorten({
			moreText: 'See more',
			lessText: 'See less',
			showChars: 180
		});
	});
}

// Loads the scatterplot
function loadScatterplot() {
	// Show the spinner while loading
	$("#scatterplotSection .spinner").show();
	// Determine what current scope and grouping id (concept/chapter/unit id) are
	var scopeOption = $("input[name=scatterplotScopeOption]:checked").val();
	var scopeGroupingId = "";
	switch (scopeOption) {
		case "concept":
			scopeGroupingId = $("[name=scatterplotConceptSelector]").val();
			break;
		case "chapter":
			scopeGroupingId = $("[name=scatterplotChapterSelector]").val();
			break;
		case "unit":
			scopeGroupingId = $("[name=scatterplotUnitSelector]").val();
			break;
	}

	d3.csv("../scatterplot_recommender_stats/scatterplot/" + scopeOption + "/" + scopeGroupingId, coerceTypes, function(error, data) {
		$("#scatterplotSection .spinner").hide();
		if (error != null) {
			console.log("Scatterplot ERROR: ", error);
		}

		//Width and height
		var margin = {top: 10, right: 10, bottom: 50, left: 55},
		    height = 450 - margin.top - margin.bottom,
		    width = 500 - margin.left - margin.right;

		var xMax = 100;//d3.max(data, function(d) { return d.x; });
		var yMax = 10;//d3.max(data, function(d) { return d.y; });
		var xMin = 0;//d3.min(data, function(d) { return d.x; });
		var yMin = 0;//d3.min(data, function(d) { return d.y; });

		//Create scale functions
		// Don't want dots overlapping axis, so add in buffer to data domain
		var xScale = d3.scale.linear()
			 .domain([0, 100])
			 .range([0, width]);
		var yScale = d3.scale.linear()
			 .domain([0, 10])
			 .range([height, 0]);

		//Define X axis
		var xAxis = d3.svg.axis()
			  .scale(xScale)
			  .orient("bottom")
			  .tickFormat("")
			  .ticks(0);
		//Define Y axis
		var yAxis = d3.svg.axis()
			  .scale(yScale)
			  .orient("left")
			  .tickFormat("")
			  .ticks(0);

		//Remove old chart
		$("#scatterplotSection svg").remove();
		//Create SVG element
		var svg = d3.select("#scatterplotSection")
			.append("svg")
			.attr("height", height+margin.top+margin.bottom)
			.attr("width", width+margin.left+margin.right)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		//Data elements are as follows (from ScatterplotRecommenderStatsController.php, in scatterplotAction())
		//$headerRow = ["group", "quiz_number", "question_number", "x", "y"];

		//Create tooltips
		//var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return d.assessment_id + "." + d.question_id; });
		var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return d.group == "student" ? "Question " + d.quiz_number + "." + d.question_number : ""; });
		svg.call(tip);

		//Create circles
		var dots = svg.selectAll("circle")
		   .data(data);

		dots.enter()
		   .append("circle")
		   .attr("cx", function(d) {
				return xScale(d.x);
		   })
		   .attr("cy", function(d) {
				return yScale(d.y);
		   })
		   .attr("r", function(d) {
			   	return d.group == "student" ? "6px" : "2px";
		   })
		   .attr("fill", function(d) {
			   	return d.group == "student" ? "#337ab7" : "gray";
		   })
		   .attr("class", function(d) {
			   	return d.group + "Point";
		   })
		   .on('mouseover', tip.show)
		   .on('mouseout', tip.hide);

		dots.exit()
		    .remove();

		//Create X axis
		svg.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0," + (height) + ")")
			.call(xAxis);
		
		//Create Y axis
		svg.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0,0)")
			.call(yAxis);
		
		//Create quadrant lines
		svg.append("line")
			.attr("x1", xScale(xMin))
			.attr("x2", xScale(xMax))
			.attr("y1", yScale((yMin + yMax) / 2))
			.attr("y2", yScale((yMin + yMax) / 2))
			.attr("class", "quadrantLine");
		svg.append("line")
			.attr("y1", yScale(yMin))
			.attr("y2", yScale(yMax))
			.attr("x1", xScale((xMin + xMax) / 2))
			.attr("x2", xScale((xMin + xMax) / 2))
			.attr("class", "quadrantLine");

		// Make sure that student points show over class points and quadrant lines
		svg.selectAll(".studentPoint").moveToFront();

		//Create custom x axis labels
		svg.append("text")
			.attr("x", xScale(xMin) + "px")
			.attr("y", (height + 20) + "px")
			.attr("text-anchor", "start")
			.text("Low");
		svg.append("text")
			.attr("x", xScale((xMin + xMax) / 2) + "px")
			.attr("y", (height + 40) + "px")
			.attr("text-anchor", "middle")
			.text("Video Time");
		svg.append("text")
			.attr("x", xScale(xMax) + "px")
			.attr("y", (height + 20) + "px")
			.attr("text-anchor", "end")
			.text("High");
		//Create custom y axis labels
		svg.append("text")
			.attr("text-anchor", "start")
			.attr("transform", "translate(-20, " + yScale(yMin) + ")rotate(270)")
			.text("Low");
		svg.append("text")
			.attr("text-anchor", "middle")
			.attr("transform", "translate(-40, " + yScale((yMin + yMax) / 2) + ")rotate(270)")
			.text("Quiz Question Attempts");
		svg.append("text")
			.attr("text-anchor", "end")
			.attr("transform", "translate(-20, " + yScale(yMax) + ")rotate(270)")
			.text("High");

		//Create quadrants
		var q1 = svg.append("rect")
			.attr("class", "quadrant")
			.attr("id", "quadrant1")
		        .on('mouseover', function() { showQuadrantInfo(1) })
			.attr("x", xScale((xMin + xMax) / 2) + "px")
			.attr("y", "0px");
		var q2 = svg.append("rect")
			.attr("class", "quadrant")
			.attr("id", "quadrant2")
		        .on('mouseover', function() { showQuadrantInfo(2) })
			.attr("x", "0px")
			.attr("y", "0px");
		var q3 = svg.append("rect")
			.attr("class", "quadrant")
			.attr("id", "quadrant3")
		        .on('mouseover', function() { showQuadrantInfo(3) })
			.attr("x", "0px")
			.attr("y", yScale((yMin + yMax) / 2) + "px");
		var q4 = svg.append("rect")
			.attr("class", "quadrant")
			.attr("id", "quadrant4")
		        .on('mouseover', function() { showQuadrantInfo(4) })
			.attr("x", xScale((xMin + xMax) / 2) + "px")
			.attr("y", yScale((yMin + yMax) / 2) + "px");

		svg.selectAll(".quadrant")
			.attr("width", width / 2 + "px")
			.attr("height", height / 2 + "px")
			.moveToBack();

		refreshView();
	});

	function coerceTypes(d) {
		d.x = +d.x;
		d.y = +d.y;
		return d;
	}
}

// Shows description for each quadrant of the scatterplot when hovered over, and give that quadrant a background
function showQuadrantInfo(quadrant) {
	// jQuery can't add a class to an SVG element with .addClass and .removeClass
	$(".quadrant").attr("class", "quadrant");
	$("#quadrant"+quadrant).attr("class","quadrant activeQuadrant");

	$(".quadrantInfo").addClass("hidden");
	$("#quadrantInfo"+quadrant).removeClass("hidden").show();
}

// Called when send feedback button is clicked. Feedback is recorded in dashboard database
function sendFeedback() {
	// Make sure there's feedback text first
	if (!$.trim($("#feedbackTextArea").val())) {
		$("#feedbackEmptyAlert").removeClass("hidden").hide().slideDown("fast");
		return;
	}
	var feedbackText = $("#feedbackTextArea").val() + "\n---\n Sent from " + window.location.href + "\n" + navigator.userAgent;
	var feedbackType = $("#feedbackTypeSelector").val();
	$("#feedbackSpinner").removeClass("hidden");
	$("#feedbackForm").slideUp();
	$.post("../feedback/submit", {"feedbackType":feedbackType,"feedback":feedbackText}, function(data) {
		$("#feedbackResult").removeClass("hidden").text(data);
		$("#feedbackSpinner").addClass("hidden");
	});
}

// Set up sticky headers for the recommendation tables
function setupStickyHeaders() {
	$('table').stickyTableHeaders('destroy');
	$('table').stickyTableHeaders({fixedOffset: $("nav")});
	$(window).trigger('resize.stickyTableHeaders');
}

// We have to do this again when we dynamically load something with tooltips
function setupBootstrapTooltips() {
	$('[data-toggle="tooltip"]').tooltip({
		container: 'body'
	});
}

// Sometimes we're just refreshing the current view, if we added advanced elements and need those to show/hide accordingly.
function refreshView() {
	changeView(currentView[0], currentView[1], true);
}

// Toggles on right of page to change what we're showing
function changeView(optionName, optionValue, refreshOnly) {
	currentView = [optionName, optionValue];

	var h = "advancedHide";
	var s = "advancedShow";
	// Hide all advanced things first
	$(".advancedSimple, .advancedMore, .advancedMoreClass, .advancedScatterplot, .advancedScatterplotClass, .advancedMasteryGraph, .advancedAll").removeClass(s).addClass(h);
	switch (optionName) {
		case "simple":
			//console.log("Changing to simple view");
			$(".advancedSimple").removeClass(h).addClass(s);
			break;
		case "more":
			//console.log("Changing to more view");
			if (optionValue == true) {
				$(".advancedSimple, .advancedMore").removeClass(h).addClass(s);
			} else {
				$(".advancedSimple").removeClass(h).addClass(s);
			}
			// The More Class checkbox is dependent on this checkbox
			$("#advancedToggleMoreClass").prop("disabled", !optionValue).prop("checked", false);
			break;
		case "scatterplot":
			//console.log("Changing to scatterplot view");
			$(".advancedScatterplot").removeClass(h).addClass(s);
			// Have to manually do things in the svg chart
			$("#scatterplotSection .classPoint").hide();
			break;
		case "masteryGraph":
			//console.log("Changing to mastery graph view");
			$(".advancedMasteryGraph").removeClass(h).addClass(s);
			if (!refreshOnly) {
				loadMasteryGraph();
			}
			animateMasteryGraph();
			break;
		case "all":
			//console.log("Changing to all view");
			$(".advancedAll").removeClass(h).addClass(s);
			if (!refreshOnly) {
				loadAllRecommendations();
			}
			break;
		case "moreClass":
			if (optionValue == true) {
				//console.log("Changing to more + class compare view");
				$(".advancedSimple, .advancedMore, .advancedMoreClass").removeClass(h).addClass(s);
			} else {
				//console.log("Changing to more view");
				$(".advancedSimple, .advancedMore").removeClass(h).addClass(s);
			}
			break;
		case "scatterplotClass":
			if (optionValue == true) {
				//console.log("Changing to scatterplot + class compare view");
				$(".advancedScatterplot, .advancedScatterplotClass").removeClass(h).addClass(s);
				$("#scatterplotSection .classPoint").fadeIn();
			} else {
				//console.log("Changing to scatterplot view");
				$(".advancedScatterplot").removeClass(h).addClass(s);
				$("#scatterplotSection .classPoint").fadeOut();
			}
			break;
	}
}

// Called for basically every click interaction. Sends an xAPI statement with the given verb and object
// verbName is often "clicked". objectName should be string with no spaces, e.g. "viewSettingMasteryGraph"
function track(verbName, objectName) {
	console.log("Tracking: ",verbName,objectName);
	sendStatement({
		statementName: 'interacted',
		dashboardID: 'scatterplot_recommender_dashboard',
		dashboardName: 'Scatterplot Recommender Dashboard',
		verbName: verbName,
		objectName: objectName
	});
}

// When page is done loading, show our visualizations
$(function() {
	// Send dashboard launched statement
	sendStatement({
		statementName: 'dashboardLaunched',
		dashboardID: 'scatterplot_recommender_dashboard',
		dashboardName: 'Scatterplot Recommender Dashboard'
	});
	// Record start load time for duration for statement
	var loadTime = Date.now();
	// Send exited statement when student leaves page
	window.onbeforeunload = function() { sendStatement({
		statementName: 'dashboardExited',
		duration: centisecsToISODuration( (Date.now() - loadTime) / 10),
		dashboardID: 'scatterplot_recommender_dashboard',
		dashboardName: 'Scatterplot Recommender Dashboard'
	}); }

	// Set up event listeneres
	$("#jumbotronDismiss").click(function() {
		$("#"+$(this).attr("data-dismiss")).hide();
		$("#mainContainer").removeClass("hidden").addClass("show");
		track("clicked", "continueButton");
	});
	// Filter concepts in left sidebar when unit selector changes
	$("[name=filterUnitSelector]").on("change", function() {
		filterConceptList();
		track("clicked","filterListUnit"+$(this).val());
	});
	// Reload the scatterplot when scope changes, and when concept/chapter/unit changes
	$("input:radio[name=scatterplotScopeOption]").on("change", function() {
		loadScatterplot();
		track("clicked","scatterplotScope"+$(this).val());
	});
	$("[name=scatterplotConceptSelector], [name=scatterplotChapterSelector], [name=scatterplotUnitSelector]").on("change", function() {
		loadScatterplot();
		track("clicked",$(this).attr("name")+$(this).val());
	});
	// Reload the recommendations when scope changes, and when concept/chapter/unit changes
	$("input:radio[name=recommendScopeOption]").on("change", function() {
		loadRecommendations();
		track("clicked","recommendScope"+$(this).val());
	});
	$("[name=recommendConceptSelector], [name=recommendChapterSelector], [name=recommendUnitSelector]").on("change", function() {
		loadRecommendations();
		track("clicked",$(this).attr("name")+$(this).val());
	});
	// Reload the mastery graph when scope changes, and when chapter/unit changes
	$("input:radio[name=masteryGraphScopeOption]").on("change", function() {
		loadMasteryGraph($(this).val());
		track("clicked","masteryGraphScope"+$(this).val());
	});
	$("[name=masteryGraphChapterSelector], [name=masteryGraphUnitSelector]").on("change", function() {
		loadMasteryGraph();
		track("clicked",$(this).attr("name")+$(this).val());
	});
	// Track when recommendation tabs are switched, and udpate table sticky headers
	$("#recommendTabs").on('shown.bs.tab', function(e) {
		track("clicked", $('#recommendSection .tab-pane.active').attr("id") + "Section");
		$(window).trigger('resize.stickyTableHeaders');
	});
	$(".advancedToggle").click(function() {
		// Deselect other options
		$(".advancedToggleLi").removeClass("active");
		$(".advancedToggleOptional").prop("checked", false);
		// Select this option
		$(this).parent(".advancedToggleLi").addClass("active");
		changeView($(this).attr("data-option"));
		track("clicked","viewSetting"+$(this).attr("data-option"));
		return false;
	});
	$(".advancedToggleOptional").change(function(event) {
		changeView($(this).attr("data-option"), this.checked);
		track("clicked","viewSetting"+$(this).attr("data-option"));
		event.stopPropagation();
		event.preventDefault();
	});
	// Set up bootstrap tooltips
	setupBootstrapTooltips();

	// Set up event listener for links that we want to track
	$(document).on("click", "[data-track]", function() {
		track("clicked", $(this).attr("data-track"));
	});
	// Add feedback button to navbar (we don't want this in the phtml template, since not all pages will have feedback modal or js)
	$("#navbarButtonHolder").append('<button class="btn btn-primary" data-toggle="modal" data-track="feedbackButton" data-target="#feedbackModal"><span style="top: 3px;" class="glyphicon glyphicon-comment"></span>&nbsp; Send Feedback</button>')
	// Bind feedback submit button click event
	$("#feedbackSendButton").click(sendFeedback);
	
	// Hide this (loadRecommendations will show it when it's done loading)
	$("#recommendContainer").hide();

	// First, we have to load data mappings for quiz questions/videos/concepts/dates
	d3.csv("../csv/mappings.csv", function(error, data) {
		mappings = data;
		// Then we can load other things
		//loadConcepts();
		//loadRecommendations();
		//loadConceptScores();
		// Don't load or show scatterplot for now
		//loadScatterplot();
	});
	// Go to simple view first
	changeView("simple");
});