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
	// Set URL of button to launc the quiz from visualization LTI tool consumer
	$(this).find(".btn-primary").attr('href','../consumer.php?app=openassessments&assessment_id=' + $(e.relatedTarget).attr('data-assessment') + '&question_id=' + $(e.relatedTarget).attr('data-question'));
	// Set the question/assessment id in the button so the button can send an interaction statement
	$(this).find(".btn-primary").attr("data-assessment",$(e.relatedTarget).attr('data-assessment')).attr("data-question", $(e.relatedTarget).attr('data-question'));
	// Track that the modal was shown
	track("clicked", "confirmLaunchQuiz" + $(e.relatedTarget).attr('data-assessment') + '.' + $(e.relatedTarget).attr('data-question'));
});
$("#questionLaunchContinueButton").click(function(e) {
	$("#questionLaunchModal").modal("hide");
	track("clicked", "launchQuiz" + $(this).attr('data-assessment') + '.' + $(this).attr('data-question'));
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
		.html(function(d) { return '<a href="../consumer.php?app=ayamel&video_id=' + d.ID + '" data-track="ayamelLaunch' + d.ID + '" target="_blank">' + d.title + '</a>'; })
		.attr("class","videoTitleCell");
	tr.append("td")
		.attr("class", "videoProgressCell advancedMore")
		.append("input")
		.attr("type", "text")
		.attr("class", "progressCircle")
		.attr("disabled", "disabled")
		.attr("value", function() { return Math.ceil(Math.random() * 100); }); // TODO put actual percentage here
		
	// Track that the modal was shown
	track("clicked", "relatedVideos" + $(e.relatedTarget).attr('data-assessment') + '.' + $(e.relatedTarget).attr('data-question'));

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
		// Sort weakest by lowest score first
		data.weakest.sort(function(a, b) {
			return a.score < b.score;
		});
		// Sort strongest by highest score first
		data.strongest.sort(function(a, b) {
			return a.score > b.score;
		});
		// Display the concepts in the lists for both weakest and strongest
		function displayConceptList(category) {
			d3.select("#" + category + "ConceptsList")
				.selectAll("div")
				.data(data[category])
				.enter()
				.append("div")
				//If their score is 0-3 make it red. If their score is 4-6 make it yellow, and if their score is > 6 make it green.
				// TODO remove these magic numbers and colors
				.style("background-color", function(d) { return d.score >= 6 ? "#5cb85c" : d.score >= 4 ? "#f0ad4e" : "#d9534f"; })
				.html(function(d) { return d.display + ": " + d.score; });
		}
		displayConceptList("weakest");
		displayConceptList("strongest");
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
		$("#recommendSection .spinner").hide();
		for (var i=1; i<5; i++) {
			//$("#recommend"+i+"List").empty();
			d3.select("#recommend"+i+"List")
				.selectAll("tr")
				.data(data["group"+i])
				.enter()
				.append("tr")
				.attr("class", "advancedSimple")
				.html(function(d) { return questionElement(d); });
			$("#recommend"+i+"List").prepend($("#templates .recommendHeaderTemplate").clone());
		}
	});
}

// Loads recommendations
function loadAllRecommendations() {
	d3.json("../content_recommender_stats/recommendations/all", function(error, data) {
		$("#recommendSection .spinner").hide();
		//TODO update this to be new table format like function above
		for (var i=1; i<5; i++) {
			//$("#recommend"+i+"List").empty();
			d3.select("#recommend"+i+"List")
				.selectAll("tr")
				.data(data["group"+i])
				.enter()
				.append("tr")
				.attr("class", "advancedAll")
				.html(function(d) { return questionElement(d); });
			//$("#recommend"+i+"List").prepend($("#templates .recommendHeaderTemplate").clone());
		}
		refreshView();
	});
}

// Loads the scatterplot
function loadScatterplot(scopeOption) {
	// Show the spinner while loading
	$("#scatterplotSection .spinner").show();
	// Default scope is concept
	scopeOption = scopeOption != null ? scopeOption : "concept";
	d3.csv("../content_recommender_stats/scatterplot/" + scopeOption, coerceTypes, function(error, data) {
		$("#scatterplotSection .spinner").hide();

		//Width and height
		var margin = {top: 10, right: 10, bottom: 50, left: 55},
		    height = 450 - margin.top - margin.bottom,
		    width = 500 - margin.left - margin.right;

		var xMax = d3.max(data, function(d) { return d.x; });
		var yMax = d3.max(data, function(d) { return d.y; });
		var xMin = d3.min(data, function(d) { return d.x; });
		var yMin = d3.min(data, function(d) { return d.y; });

		//Create scale functions
		// Don't want dots overlapping axis, so add in buffer to data domain
		var xScale = d3.scale.linear()
			 .domain([xMin, xMax])
			 .range([0, width]);
		var yScale = d3.scale.linear()
			 .domain([yMin, yMax])
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

		//Data elements are as follows ["student/class", "conceptId", x, y]

		//Create tooltips
		//var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return d.assessment_id + "." + d.question_id; });
		var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return d.group == "student" ? d.x + "." + d.y : ""; });
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
		refreshView();
	});

	function coerceTypes(d) {
		d.x = +d.x;
		d.y = +d.y;
		return d;
	}
}

// Loads the scatterplot
function loadMasteryGraph(scopeOption) {
	// Show the spinner while loading
	$("#masteryGraphSection .spinner").show();
	// Default scope is chapter
	scopeOption = scopeOption != null ? scopeOption : "chapter";
	// TODO don't use absolute url ref here
	d3.json("../content_recommender_stats/masteryGraph/" + scopeOption, function(error, data) {
		$("#masteryGraphSection .spinner").hide();

		//Width and height
		var margin = {top: 10, right: 10, bottom: 180, left: 40},
		    height = 550 - margin.top - margin.bottom,
		    width = (35 * data.length + 100) - margin.left - margin.right;
		
		var x = d3.scale.ordinal()
			.rangeRoundBands([0, width], .1);
		var y = d3.scale.linear()
			.range([height, 0]);
		
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");
		var yAxis = d3.svg.axis()
			.scale(y)
			.orient("left");
		
		//Color scale
		var colorScale = d3.scale.linear()
				.domain([0, 3.3, 6.6, 10])
				.range(["red", "orange", "yellow", "green"]);

		//Remove old chart
		$("#masteryGraphSection svg").remove();
		//Create SVG element with padded container for chart
		var chart = d3.select("#masteryGraphSection .svgContainer")
			.append("svg")
			.attr("height", height+margin.top+margin.bottom)
			.attr("width", width+margin.left+margin.right)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		x.domain(data.map(function(d) { return d.display; }));
		y.domain([0, 10]);

		//Create tooltips
		var tip = d3.tip().attr('class', 'd3-tip').offset([-10,0]).html(function(d) { return d.score; });
		chart.call(tip);

		var bars = chart.selectAll(".bar")
			.data(data)
			.enter().append("g")
			.attr("transform", function(d) { return "translate(" + x(d.display) + ", 0)"; })
			.attr("class", "bar");

		var rects = bars.append("rect")
			//.attr("x", function(d) { return x(d.name); })
			//y and height are temporary, but must have initial values for transition to work
			.attr("y", height + "px")
			.attr("height", 0 + "px")
			.attr("width", x.rangeBand())
			.attr("fill", function(d) { return colorScale(d.score); })
			.attr("cursor", "pointer")
			.attr("data-toggle", "modal")
			.attr("data-target", "#openAssessmentStatsModal")
			.attr("data-name", function(d) { return d.id; })
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide);

		// Y axis
		chart.append("g")
			.attr("class", "axis y")
			.call(yAxis);
		// X axis with rotated and wrapped labels
		chart.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis)
			.selectAll(".tick text")  
			.attr("dy", "-.9em")
			.attr("dx", "-1em")
			.call(wrap, 200);
		chart.selectAll(".axis.x .tick text")
			.style("text-anchor", "end")
			.attr("transform", function(d) {
				return "rotate(-90)" 
			})
			.selectAll("tspan");

		rects.transition()
			.duration(500)
			.delay(function(d, i) { return i * 10; })
			.attr("y", function(d) { return y(d.score); })
			.attr("height", function(d) { return height - y(d.score); });
		//refreshView();
	});

	function coerceTypes(d) {
		d.x = +d.x;
		d.y = +d.y;
		return d;
	}
}

// Function to make the mastery graph bar chart animate
function animateMasteryGraph() {
	// TODO 310 is a magic number
	var y = d3.scale.linear()
		.range([310, 0])
		.domain([0, 10]);
	d3.selectAll("#masteryGraphSection svg .bar rect")
		.attr("y", 310)
		.attr("height", 0)
		.transition()
		.duration(500)
		.delay(function(d, i) { return i * 10; })
		.attr("y", function(d) { return y(d.score); })
		.attr("height", function(d) { return 310 - y(d.score); });
}

// Helper function from http://bl.ocks.org/mbostock/7555321
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        dx = parseFloat(text.attr("dx")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").attr("dx", dx + "em").text(word);
      }
    }
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
			$(".advancedSimple, .advancedMore").removeClass(h).addClass(s);
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
		dashboardID: 'content_recommender_dashboard',
		dashboardName: 'Content Recommender Dashboard',
		verbName: verbName,
		objectName: objectName
	});
}

// When page is done loading, show our visualizations
$(function() {
	// Send dashboard launched statement
	sendStatement({
		statementName: 'dashboardLaunched',
		dashboardID: 'content_recommender_dashboard',
		dashboardName: 'Content Recommender Dashboard'
	});
	// Record start load time for duration for statement
	var loadTime = Date.now();
	// Send exited statement when student leaves page
	window.onbeforeunload = function() { sendStatement({
		statementName: 'dashboardExited',
		duration: centisecsToISODuration( (Date.now() - loadTime) / 10),
		dashboardID: 'student_skills_dashboard',
		dashboardName: 'Student Skills Dashboard'
	}); }

	// Set up event listeneres
	$("#jumbotronDismiss").click(function() {
		$("#"+$(this).attr("data-dismiss")).hide();
		$("#mainContainer").removeClass("hidden").addClass("show");
		track("clicked", "continueButton");
	});
	// Reload the scatterplot when scope changes
	$("input:radio[name=scatterplotScopeOption]").on("change", function() {
		loadScatterplot($(this).val());
		track("clicked","scatterplotScope"+$(this).val());
	});
	// Reload the mastery graph when scope changes
	$("input:radio[name=masteryGraphScopeOption]").on("change", function() {
		loadMasteryGraph($(this).val());
		track("clicked","masteryGraphScope"+$(this).val());
	});
	// Track when recommendation sections are switched
	$("#recommendationsAccordion").on('shown.bs.collapse', function(e) {
		track("clicked", $('#recommendationsAccordion .in').attr("id") + "Section");
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
	$('[data-toggle="tooltip"]').tooltip({
		container: 'body'
	});
	// Set up event listener for links that we want to track
	$(document).on("click", "[data-track]", function() {
		track("clicked", $(this).attr("data-track"));
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
