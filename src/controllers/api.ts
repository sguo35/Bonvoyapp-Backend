"use strict";

import async from "async";
import request from "request";
import graph from "fbgraph";
import { Response, Request, NextFunction } from "express";

import "isomorphic-fetch";

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
  body: {
    tastes: string;
    location: string;
    interests: string;
    startTime: string;
    endTime: string;
    budget: number;
    startLocation: string;
  }
};
const yelp = require('yelp-fusion');

// Place holder for Yelp Fusion's API Key. Grab them
// from https://www.yelp.com/developers/v3/manage_app
const apiKey = process.env.YELP_API;



const getData = async (loc: any, pref: any) => {
  const searchRequest = {
    location: loc,
    term: pref,
    limit: 5
  };
  //console.log(searchRequest);
  const client = yelp.client(apiKey);

  const response = await client.search(searchRequest);
  return response.jsonBody.businesses;
}
export let getVacation = async (req: GetVacation, res: Response) => {
  // query Yelp for each of the tastes and interests, according to the budget guidelines
  // get breakfast restaurants
  let breakfastArr = Array<any>(0);
  let breakfasts = req.body.tastes.split(" ");
  for (let taste of breakfasts) {
    breakfastArr = breakfastArr.concat(await getData(req.body.location, taste + " breakfast"));
  }

  // get restaurants
  let tastesArr = Array<any>(0);
  let tastes = req.body.tastes.split(" ");
  for (let taste of tastes) {
    tastesArr = tastesArr.concat(await getData(req.body.location, taste));
  }

  let interestsArr = Array<any>(0);
  let interests = req.body.interests.split(" ");
  for (let interest of interests) {
    interestsArr = interestsArr.concat(await getData(req.body.location, interest));
  }

  // query for hotels
  let hotels: any = await getData(req.body.location, "hotels");

  let googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_API_KEY
  });

  let destinationAirport: any = "";
  googleMapsClient.places({
    query: `international airport near ${req.body.location}`
  }, function (err: any, response: any) {
    if (!err) {
      destinationAirport = response.json.results[0];
    } else {
      console.log(err);
    }
  });

  let startAirport: any = "";
  googleMapsClient.places({
    query: `international airport near ${req.body.startLocation}`
  }, async function (err: any, response: any) {
    if (!err) {
      startAirport = response.json.results[0];
      //console.log(startAirport);
      //console.log(destinationAirport);
      let airTransport = {
        startAirport: startAirport,
        endAirport: destinationAirport,
        price: Math.round((Math.floor(Math.random() * 13) + 8)
          * Math.sqrt((
            Math.pow(startAirport.geometry.location.lng - destinationAirport.geometry.location.lng, 2) +
            Math.pow(startAirport.geometry.location.lat - destinationAirport.geometry.location.lat, 2))))
      }

      // return the array result
      const result = optimize(interestsArr, breakfastArr, tastesArr, hotels, airTransport, new Date(req.body.startTime), new Date(req.body.endTime), req.body.budget);

      const outResult = {
        itinerary: result,
        transportation: airTransport
      }

      res.json(outResult);
      res.status(200);
      res.end();
    }
  });

};

interface DayItinerary {
  breakfast: any;
  lunch: any;
  dinner: any;
  hotel: any;
  attractions: any;
  date: string;
  moneySpent: number;
  [key: string]: any;
}

/**
 * Creates an optimal itinerary for a vacation given the fetched attractions, restaurants, and hotels.
 * @param attractions 
 * @param restaurants 
 * @param hotels 
 */
const optimize = (attractions: Array<any>, breakfastRestaurants: Array<any>, restaurants: Array<any>,
  hotels: any, transportationAir: Object,
  startTime: Date, endTime: Date, budget: number): any => {
  // The cost is defined by either the dollar sign bracket if it's a restaurant
  // or the actual dollar cost as defined by Expedia/Uber if it's a hotel/transportation/plane ride.

  // compute the number of days this trip will take
  let difference = endTime.getTime() - startTime.getTime();
  difference /= (1000 * 60 * 60 * 24);
  difference = Math.round(difference);

  let stopSearching: boolean = false;

  let outObj = new Array<DayItinerary>(0);
  let moneySpent: number = 0;

  const priceLookup = {
    'restaurant': 10,
    'attraction': 30
  }

  // while we still have money, keep spending to fill out the day and if we finish looping
  // then start upgrading stuff
  let hotel: any = "";
  // find a hotel
  hotel = hotels[0];
  hotel.price = hotel.price.length * (Math.random() * 200 + 150);
  for (let day = 0; day < difference && moneySpent < budget; day++) {
    moneySpent += hotel.price;

    let dayIt: DayItinerary = {
      breakfast: {},
      lunch: {},
      dinner: {},
      hotel: hotel,
      attractions: [],
      date: (new Date(startTime.getTime() + (1000 * 60 * 60 * 24 * day))).toISOString(),
      moneySpent: 0
    }

    for (let objKey in dayIt) {
      // check if it'll go over our budget
      if (moneySpent > budget) {
        break;
      }

      if (objKey == "attractions") {
        // find 3 attractions
        for (let i = 0; i < 3; i++) {
          dayIt[objKey].push(attractions[Math.floor(Math.random() * attractions.length)])
          //console.log(dayIt[objKey][i])
          if (dayIt[objKey][i].price)
            {dayIt[objKey][i].price = priceLookup['attraction'] * dayIt[objKey][i].price.length;}
          else
            {dayIt[objKey][i].price = priceLookup['attraction'] * Math.random() * 3 + 1;}
          if (!dayIt[objKey][i].price) {
            //console.log("test1");
            dayIt[objKey][i].price = priceLookup['attraction'] * Math.random() * 3 + 1;
          }
          moneySpent += dayIt[objKey][i].price;
        }
      } else if (objKey == "breakfast") {
        dayIt[objKey] = breakfastRestaurants[Math.floor(Math.random() * breakfastRestaurants.length)];
        if (dayIt[objKey].price)
          {dayIt[objKey].price = priceLookup['restaurant'] * dayIt[objKey].price.length;}
        else
          {dayIt[objKey].price = priceLookup['restaurant'] * Math.random() * 3 + 1;}

        if (!dayIt[objKey].price) {
          //console.log("test2");
          dayIt[objKey].price = priceLookup['restaurant'] * Math.random() * 3 + 1;
        }
        moneySpent += dayIt[objKey].price;
      } 
      else if (objKey != "hotel" && objKey != "date" && objKey != "breakfast") {

        // otherwise just compute the price and add it
        dayIt[objKey] = restaurants[Math.floor(Math.random() * restaurants.length)];
        if (dayIt[objKey].price)
          {dayIt[objKey].price = priceLookup['restaurant'] * dayIt[objKey].price.length;}
        else
          {dayIt[objKey].price = priceLookup['restaurant'] * Math.random() * 3 + 1;}
          if (!dayIt[objKey].price) {
            //console.log("test3");
            dayIt[objKey].price = priceLookup['restaurant'] * Math.random() * 3 + 1;
          }
        moneySpent += dayIt[objKey].price;
      }
    }
    dayIt["moneySpent"] = moneySpent;
    outObj.push(dayIt);
  }
  return outObj;
};

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
