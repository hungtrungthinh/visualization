<?php

use Phalcon\Mvc\Controller;

class AssessmentStatsController extends Controller
{
	public function initialize() {
		$this->tag->setTitle('Statements');
	}
	public function indexAction() {
		error_reporting(E_ALL);
		// Get our context (this takes care of starting the session, too)
		$context = $this->getDI()->getShared('ltiContext');
		$this->view->ltiContext = $context;
		$this->view->userAuthorized = $context->valid;

		if ($context->valid) {
			// This contains our different data elements
			$result = Array();
			$statementHelper = new StatementHelper();

			//Get number of question attempts
			$attempts = $statementHelper->getStatements("openassessments",'[{"$match":{"voided":false, "statement.actor.mbox": "mailto:'.$context->getUserEmail().'", "statement.verb.id":"http://adlnet.gov/expapi/verbs/attempted"}},{"$project":{"_id":1 }}]');
			if ($attempts["error"]) {
				$result []= ["error" => $attempts["error"]];
			} else {
				$result []= ["name" => "Question Attempts", "value" => count($attempts["statements"])];
			}

			//Get number of correct attempts
			$correctAttempts = $statementHelper->getStatements("openassessments",'[{"$match":{"voided":false, "statement.actor.mbox": "mailto:'.$context->getUserEmail().'", "statement.verb.id":"http://adlnet.gov/expapi/verbs/answered", "statement.result.success":true}},{"$project":{"_id":1 }}]');
			if ($correctAttempts["error"]) {
				$result []= ["error" => $correctAttempts["error"]];
			} else {
				$result []= ["name" => "Correct Attempts", "value" => count($correctAttempts["statements"])];
			}

			//Get number of incorrect attempts
			$incorrectAttempts = $statementHelper->getStatements("openassessments",'[{"$match":{"voided":false, "statement.actor.mbox": "mailto:'.$context->getUserEmail().'", "statement.verb.id":"http://adlnet.gov/expapi/verbs/answered", "statement.result.success":false}},{"$project":{"_id":1 }}]');
			if ($incorrectAttempts["error"]) {
				$result []= ["error" => $incorrectAttempts["error"]];
			} else {
				$result []= ["name" => "Incorrect Attempts", "value" => count($incorrectAttempts["statements"])];
			}

			echo json_encode($result);
		} else {
			echo '[{"error":"Invalid lti context"}]';
		}
		
		$this->view->disable();
	}
}
