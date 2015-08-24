// Table helper function that uses d3 to create a table based on column information and data passed
function tableHelper(table, columns, data) {
	table.append('colgroup')
		.select('col')
		.data(columns)
		.enter()
		.append('col')
		.attr('class', function(d) { return d.cl; });

	table.append('thead').append('tr')
		.selectAll('th')
		.data(columns)
		.enter()
		.append('th')
		.html(function(d) { return d.head; });

	table.append('tbody')
		.selectAll('tr')
		.data(data).enter()
		.append('tr')
		.selectAll('td')
		.data(function(row, i) {
			return columns.map(function(c) {
				var cell = {};
				d3.keys(c).forEach(function(k) {
					cell[k] = typeof c[k] == 'function' ? c[k](row,i) : c[k];
				});
				return cell;
			});
		}).enter()
		.append('td')
		.html(function(d) { return d.html; })
		.attr('class', function(d) { return d.cl; });
}


// Questions table
function updateQuestionsTable() {
	// Load stats data
	// TODO don't use absolute url ref here
	d3.json("../content_recommender_stats/questions_table", function(error, data) {
		//Hide the loading spinner
		$("#questionsTable .spinner").hide();
		// TODO error checking
		var columns = [
			{ head: '', cl: 'questionNumberCell', html: function(d) { return d.question_id + "."; } },
			{ head: 'Question', cl: 'questionTextCell', html: function(d) { return d.text; } },
			{ head: 'Attempts', cl: 'questionAttemptsCell', html: function(d) { return d.attempts; } },
			{ head: 'Correct', cl: function(d) { return 'questionCorrectCell ' + (d.correct ? 'bg-success' : 'bg-danger'); }, html: function(d) { return d.correct ? '<span class="glyphicon glyphicon-ok"></span>' : '<span class="glyphicon glyphicon-remove"></span>'; } },
			// TODO absolute URL ref fix
			{ head: 'Launch Quiz', cl: 'questionLaunchCell', html: function(d) { return '<a data-toggle="modal" data-target="#questionLaunchModal" data-assessment="' + d.assessment_id + '" data-question="' + d.question_id + '" href="#"><span class="glyphicon glyphicon-log-in"></span></a>'; } }
		];
		var table = d3.select("#questionsTable table");
		tableHelper(table, columns, data);
	});
}


// Videos table
function updateVideosTable() {
	// TODO absolute URL ref fix
	d3.csv("../csv/ChemPathVideos.csv", function(error, data) {
		//Hide the loading spinner
		$("#videosTable .spinner").hide();
		//console.log("csv", error, data);
		// Filter the data to only show required videos
		data = data.filter(function(d) { return d.optional != 1; });
		//var columns = [
			//{ head: '&nbsp;', cl: 'videoRefCell', html: function(d) { return d.chapter + "." + d.section + "." + d.group + "." + d.video; } },
			//{ head: 'Video Name', cl: 'videoTitleCell', html: function(d) { return d.attempts; } },
			//{ head: '% Watched', cl: '', html: function(d) { return Math.ceil(Math.random() * 100); } }
		//];
		var tbody = d3.select("#videosTable table tbody");
		var tr = tbody.selectAll("tr")
			.data(data)
			.enter()
			.append("tr")
			.attr("id", function(d) { return "videoRow"+d.ID; });

		tr.append("td")
			.html(function(d) { return d.chapter + "." + d.section + "." + d.group + "." + d.video; })
			.attr("class","videoRefCell");
		tr.append("td")
			// TODO absolute URL ref fix
			.html(function(d) { return '<a href="../consumer.php?app=ayamel&video_id=' + d.ID + '" target="_blank">' + d.title + '</a>'; })
			.attr("class","videoTitleCell");
		tr.append("td")
			.attr("class", "videoProgressCell")
			.append("input")
			.attr("type", "text")
			.attr("class", "progressCircle")
			.attr("disabled", "disabled")
			.attr("value", function() { return Math.ceil(Math.random() * 100); });
			
		// Don't stall the UI waiting for all these to finish drawing
		setTimeout(updateVideoProgressCircles, 1);
	});
}

function updateVideoProgressCircles() {
	$(".progressCircle").knob({
		'readOnly': true,
		'width': '45',
		'height': '45',
		'thickness': '.25',
		'fgColor': '#444',
		'format': function(v) { return v+"%"; }
	});
}

// Question Launch Modal
$("#questionLaunchModal").on("show.bs.modal", function(e) {
	$(this).find(".btn-primary").attr('href','../consumer.php?app=openassessments&assessment_id=' + $(e.relatedTarget).attr('data-assessment') + '&question_id=' + $(e.relatedTarget).attr('data-question'));
});
$("#questionLaunchContinueButton").click(function(e) {
	$("#questionLaunchModal").modal("hide");
});

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
		.attr("id", function(d) { return "videoRow"+d.ID; });

	tr.append("td")
		.html(function(d) { return d.chapter + "." + d.section + "." + d.group + "." + d.video; })
		.attr("class","videoRefCell");
	tr.append("td")
		// TODO absolute URL ref fix
		.html(function(d) { return '<a href="../consumer.php?app=ayamel&video_id=' + d.ID + '" target="_blank">' + d.title + '</a>'; })
		.attr("class","videoTitleCell");
	tr.append("td")
		.attr("class", "videoProgressCell advancedMore")
		.append("input")
		.attr("type", "text")
		.attr("class", "progressCircle")
		.attr("disabled", "disabled")
		.attr("value", function() { return Math.ceil(Math.random() * 100); }); // TODO put actual percentage here
		
	// Don't stall the UI waiting for all these to finish drawing
	setTimeout(updateVideoProgressCircles, 1);
	refreshView();
});


// Returns videos for a given question
function getRelatedVideos(assessmentId, questionId) {
	var relatedVideos = [];
	// TODO Get associated chapter from assessmentid. For now, assuming 1->1 correlation between the two.
	for (var i=0; i<mappings.length; i++) {
		// See if this question is associated with this video
		if ($.inArray(assessmentId+"."+questionId, mappings[i]["Quiz Questions"].split(",")) > -1) {
			relatedVideos.push(mappings[i]);
		}
	}
	return relatedVideos;
}

// Loads strongest and weakest concepts
function loadConcepts() {
	d3.json("../content_recommender_stats/concepts", function(error, data) {
		$("#conceptsSection .spinner").hide();
		console.log(error, data);
		d3.select("#strongestConceptsList")
			.selectAll("li")
			.data(data.strongest)
			.enter()
			.append("li")
			.html(function(d) { return d.display; });
		d3.select("#weakestConceptsList")
			.selectAll("li")
			.data(data.weakest)
			.enter()
			.append("li")
			.html(function(d) { return d.display; });
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
function loadRecommendations() {
	d3.json("../content_recommender_stats/recommendations", function(error, data) {
		$("#recommendationsSection .spinner").hide();
		//console.log(error, data);
		for (var i=1; i<5; i++) {
			d3.select("#recommend"+i+"List")
				.selectAll("li")
				.data(data["group"+i])
				.enter()
				.append("li")
				.html(function(d) { return questionElement(d); });
		}
	});
}

// Loads the scatterplot
function loadScatterplot() {
	d3.json("../content_recommender_stats/scatterplot", function(error, data) {
		$("#scatterplotSection .spinner").hide();
		console.log("scatterplot", error, data);

		//Width and height
		var margin = {top: 10, right: 10, bottom: 50, left: 55},
		    height = 450 - margin.top - margin.bottom,
		    width = 500 - margin.left - margin.right;

		//Create scale functions
		var xScale = d3.scale.linear()
			 .domain([-10, 10])
			 .range([0, width]);
		var yScale = d3.scale.linear()
			 .domain([-10, 10])
			 .range([height, 0]);

		//Define X axis
		var xAxis = d3.svg.axis()
			  .scale(xScale)
			  .orient("bottom")
			  .tickFormat("")
			  .ticks(5);
		//Define Y axis
		var yAxis = d3.svg.axis()
			  .scale(yScale)
			  .orient("left")
			  .tickFormat("")
			  .ticks(5);

		//Create SVG element
		$("#scatterplot").height(height+margin.top+margin.bottom).width(width+margin.left+margin.right);
		var svg = d3.select("#scatterplot")
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		//Create tooltips
		var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return d[0]; });
		svg.call(tip);

		//Create circles
		var dots = svg.selectAll("circle")
		   .data(data);

		dots.enter()
		   .append("circle")
		   .attr("cx", function(d) {
				return xScale(d[1]);
		   })
		   .attr("cy", function(d) {
				return yScale(d[2]);
		   })
		   .attr("r", "5px")
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
		
		//Create custom x axis labels
		svg.append("text")
			.attr("x", xScale(-9) + "px")
			.attr("y", (height + 20) + "px")
			.attr("text-anchor", "start")
			.text("Low");
		svg.append("text")
			.attr("x", xScale(0) + "px")
			.attr("y", (height + 40) + "px")
			.attr("text-anchor", "middle")
			.text("Video Time");
		svg.append("text")
			.attr("x", xScale(9) + "px")
			.attr("y", (height + 20) + "px")
			.attr("text-anchor", "end")
			.text("High");
		//Create custom y axis labels
		svg.append("text")
			.attr("text-anchor", "start")
			.attr("transform", "translate(-20, " + yScale(-9) + ")rotate(270)")
			.text("Low");
		svg.append("text")
			.attr("text-anchor", "middle")
			.attr("transform", "translate(-40, " + yScale(0) + ")rotate(270)")
			.text("Quiz Question Attempts");
		svg.append("text")
			.attr("text-anchor", "end")
			.attr("transform", "translate(-20, " + yScale(9) + ")rotate(270)")
			.text("High");
	});
}

// Sometimes we're just refreshing the current view, if we added advanced elements and need those to show/hide accordingly.
function refreshView() {
	changeView(currentView[0], currentView[1]);
}

// Toggles on right of page to change what we're showing
function changeView(optionName, optionValue) {
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
			$(".advancedSimple, .advancedMore").removeClass(h).addClass(s);
			break;
		case "scatterplot":
			//console.log("Changing to scatterplot view");
			$(".advancedScatterplot").removeClass(h).addClass(s);
			break;
		case "masteryGraph":
			//console.log("Changing to mastery graph view");
			$(".advancedMasteryGraph").removeClass(h).addClass(s);
			break;
		case "all":
			//console.log("Changing to all view");
			$(".advancedSimple, .advancedAll").removeClass(h).addClass(s);
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
			} else {
				//console.log("Changing to scatterplot view");
				$(".advancedScatterplot").removeClass(h).addClass(s);
			}
			break;
	}
}

// When page is done loading, show our visualizations
$(function() {
	// Send dashboard launched statement
	sendStatement({
		statementName: 'dashboardLaunched',
		dashboardID: 'content_recommender_dashboard',
		dashboardName: 'Content Recommender Dashboard'
	});

	// Set up event listeneres
	$("#jumbotronDismiss").click(function() {
		$("#"+$(this).attr("data-dismiss")).hide();
		$("#mainContainer").removeClass("hidden").addClass("show");
	});
	$(".advancedToggle").click(function() {
		// Deselect other options
		$(".advancedToggleLi").removeClass("active");
		$(".advancedToggleOptional").prop("checked", false);
		// Select this option
		$(this).parent(".advancedToggleLi").addClass("active");
		changeView($(this).attr("data-option"));
		return false;
	});
	$(".advancedToggleOptional").change(function(event) {
		changeView($(this).attr("data-option"), this.checked);
		event.stopPropagation();
		event.preventDefault();
	});
	// Set up bootstrap tooltips
	$('[data-toggle="tooltip"]').tooltip({
		container: 'body'
	});
	
	// Load data
	updateQuestionsTable();
	updateVideosTable();

	// First, we have to load data mappings for quiz questions/videos/concepts/dates
	d3.csv("../csv/mappings.csv", function(error, data) {
		mappings = data;
		// Then we can load other things
		loadConcepts();
		loadRecommendations();
		loadScatterplot();
	});
	// Go to simple view first
	changeView("simple");
});
