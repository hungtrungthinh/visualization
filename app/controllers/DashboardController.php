<?php

use Phalcon\Mvc\Controller;

class DashboardController extends Controller
{
	public function initialize() {
		$this->tag->setTitle('Visualization Dashboard');
		$this->view->pageTitle = 'Visualization Dashboard';

		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		$this->view->context = $context;
		// Fetch user settings
		//$currentSettings = UserSettings::query()
				//->where("userId = :userId:")
				//->bind(["userId" => $context->getUserKey()])
				//->execute();
		//$this->view->currentSettings = $currentSettings;
	}
	public function indexAction() {
		$context = $this->getDI()->getShared('ltiContext');
		// TODO this is where need to redirect users to appropriate dashboard based on their current group, or provide options

		//$setting = new UserSettings();
		//$setting->userId = $context->getUserKey();
		//$setting->name = "test";
		//$setting->value = "randomvalue";
		//$setting->save();
	}
	public function content_recommenderAction() {
		$this->tag->setTitle('Test Help | Student Dashboard');
		$this->view->pageTitle = 'Test Help | Student Dashboard';
		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		$this->view->context = $context;

		$this->view->feedbackEmail = $this->getDI()->getShared('config')->feedback_email;

		// Concept, Chapter, and Unit lists
		// TODO way to have html list default to current
		// Concepts
		$conceptsMapping = MappingHelper::conceptsInChapters(MappingHelper::allChapters());
		$concepts = [];
		// Make each hierarchical content category have consistent structure for view
		foreach ($conceptsMapping as $c) {
			$concepts [] = ["id" => $c["Section Number"], "title" => $c["Section Number"] . " " . $c["Section Title"]];
		}
		$this->view->concepts = $concepts;

		// Chapters
		$chaptersMapping = CSVHelper::parseWithHeaders('csv/chapter_unit.csv');
		$chapters = [];
		foreach ($chaptersMapping as $c) {
			$chapters [] = ["id" => $c["Chapter Number"], "title" => $c["Chapter Number"] . " " . $c["Chapter Title Short"]];
		}
		$this->view->chapters = $chapters;

		// Units
		$unitsMapping = CSVHelper::parseWithHeaders('csv/unit_chapter.csv');
		$units = [];
		foreach ($unitsMapping as $u) {
			$units [] = ["id" => $u["unit_number"], "title" => $u["unit_title"]];
		}
		$this->view->units = $units;
	}
	public function scatterplot_recommenderAction() {
		$this->tag->setTitle('Test Help | Student Dashboard');
		$this->view->pageTitle ='Test Help | Student Dashboard';
		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		$this->view->context = $context;
		$this->view->feedbackEmail = $this->getDI()->getShared('config')->feedback_email;

		// Concept, Chapter, and Unit lists
		// TODO way to have html list default to current
		// Concepts
		$conceptsMapping = MappingHelper::conceptsInChapters(MappingHelper::allChapters());
		$concepts = [];
		// Make each hierarchical content category have consistent structure for view
		foreach ($conceptsMapping as $c) {
			$concepts [] = ["id" => $c["Section Number"], "title" => $c["Section Number"] . " " . $c["Section Title"]];
		}
		$this->view->concepts = $concepts;

		// Chapters
		$chaptersMapping = CSVHelper::parseWithHeaders('csv/chapter_unit.csv');
		$chapters = [];
		foreach ($chaptersMapping as $c) {
			$chapters [] = ["id" => $c["Chapter Number"], "title" => $c["Chapter Number"] . " " . $c["Chapter Title Short"]];
		}
		$this->view->chapters = $chapters;

		// Units
		$unitsMapping = CSVHelper::parseWithHeaders('csv/unit_chapter.csv');
		$units = [];
		foreach ($unitsMapping as $u) {
			$units [] = ["id" => $u["unit_number"], "title" => $u["unit_title"]];
		}
		$this->view->units = $units;
	}
	public function student_skillsAction() {
		$this->tag->setTitle('Improve my Learning | Student Dashboard');
		$this->view->pageTitle ='Improve my Learning Dashboard';
		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		$this->view->context = $context;
		$this->view->feedbackEmail = $this->getDI()->getShared('config')->feedback_email;
	}

	public function resourcesAction() {
		$this->tag->setTitle('Course Resources | Student Dashboard');
		$this->view->pageTitle ='Course Resources | Student Dashboard';
		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		// Get list of conceptes (quizzes)
		$conceptsMapping = MappingHelper::conceptsInChapters(MappingHelper::allChapters());
		$concepts = [];
		$resources = [];
		foreach ($conceptsMapping as $c) {
			$concepts [] = ["id" => $c["Section Number"], "title" => $c["Section Number"] . " " . $c["Section Title"]];
			$conceptId = $c["Section Number"];
			// Get resources for each of the concepts
			$resourceLists[$conceptId] = MappingHelper::resourcesForConcept($conceptId);
		}
		// Figure out which concept to position the list at (based on the current day)
		$currentConceptID = "";
		// This is assuming that the first resource for every concept has a date, and that they are listed in the CSV in chronological non-descending order
		// Find the first resource that's past today, and then use the concept of the previous resource
		$today = strtotime("today");
		foreach ($resourceLists as $resourceList) {
			if (count($resourceList) > 0) {
				if (strtotime($resourceList[0]["Date"]) > $today) {
					break;
				} else {
					$currentConceptID = $resourceList[0]["Section Number"];
					// If this resource has a date of today, then stop
					if (strtotime($resourceList[0]["Date"]) == $today) {
						break;
					}
				}
			}
		}
		$this->view->concepts = $concepts;
		$this->view->resources = $resourceLists;
		$this->view->currentConceptID = $currentConceptID;

	}
	public function selectAction() {
		$this->tag->setTitle('Dashboard Selection');
		$this->view->pageTitle ='Dashboard Selection';
		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		// Send a statement tracking that they viewed this page
		$statementHelper = new StatementHelper();
		$statement = $statementHelper->buildStatement([
			"statementName" => "dashboardLaunched",
			"dashboardID" => "dashboard_select",
			"dashboardName" => "Dashboard Selector",
			"verbName" => "launched",
		], $context);
		if ($statement) {
			$statementHelper->sendStatements("visualization", [$statement]);
		}
	}
}
