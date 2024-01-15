import express, { Express, Request, Response, Router, RouterOptions } from "express";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import errorMiddleware from "../Shared/middlewares/error.middleware"
import dotenv from "dotenv";
import "../Shared/config/google.config";
import { Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth2";
import User from "../Shared/models/user.model";
import Apperror from "../Shared/utils/Apperror.util";
import connectToDb from "./../Shared/config/mongo.db.config";


dotenv.config({
  path: "../.env",
});
const app: Express = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
// app.use(cors())

dotenv.config({
  path: "../.env",
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: `${process.env.DOMAIN}/api/v1/user/auth/google/callback` as string,
    passReqToCallback: true, 
  },
  async function(request: Request, accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    try {
      const ifuserExists = await User.findOne({ googleId: profile.id });

      if (ifuserExists) {
        done(null, ifuserExists);
      } else {
        const user = await User.create({
          name: profile.displayName,
          email: profile.email,
          picture: profile.picture,
          sub: profile.sub,
          domain: profile.domain,
          googleId: profile.id,
          acessToken : accessToken
        });
        await user.save();
        done(null, user);
      }
    } catch (error:any) {
      done(new Apperror(error.message, 400), null);
    }
  }
));

passport.serializeUser(function(user: any, done: (error: any, id?: any) => void) {
  done(null, user._id);
});

passport.deserializeUser(async function(id: any, done: (error: any, user?: any) => void) {
  const user = await User.findById(id);
  if (user) {
    return done(null, user);
  }
});





app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/api/v1/user", userRoutes  );


app.use("*", (req: Request, res: Response) => {
  res.send("404 Not Found");
}) 
app.use(errorMiddleware)

const port = 4000;

connectToDb();

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
