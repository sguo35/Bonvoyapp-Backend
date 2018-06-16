"use strict";

import async from "async";
import request from "request";
import graph from "fbgraph";
import { Response, Request, NextFunction } from "express";


/**
 * GET /api
 * List of API examples.
 */
export let getApi = (req: Request, res: Response) => {
  res.render("api/index", {
    title: "API Examples"
  });
};

interface GetVacation extends Request {
  tastes: Array<string>,
  location: string,
  interests: Array<string>,
  startTime: string,
  endTime: string,
  budget: number
};

export let getVacation = async (req: GetVacation, res: Response) => {
  // query Yelp for each of the tastes and interests, according to the budget guidelines

  // call our optimization algorithm to take the Yelp areas of attraction, time frame to create itinerary

  // return the 2D array result
  const result = {};
  res.json(result);
  res.statusCode(200);
  res.end();
}

/**
 * GET /api/facebook
 * Facebook API example.
 */
export let getFacebook = (req: Request, res: Response, next: NextFunction) => {
  const token = req.user.tokens.find((token: any) => token.kind === "facebook");
  graph.setAccessToken(token.accessToken);
  graph.get(`${req.user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err: Error, results: graph.FacebookUser) => {
    if (err) { return next(err); }
    res.render("api/facebook", {
      title: "Facebook API",
      profile: results
    });
  });
};
