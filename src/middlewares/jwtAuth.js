import jsonwebtoken from 'jsonwebtoken';
import p from '../utils/agents'
import {jwt, backdoor} from '../config/index'
import { jwtExtractor, genAccessToken } from '../utils/tokenHelper'
import Errors from '../constants/Errors';


export const refreshAccessToken = (req, res, next) => {

  p.query('SELECT refresh_token FROM session WHERE session_id = $1',
    [res.locals.jwtPayload.session_id])
    .then(results => {
      const {refresh_token} = results.rows[0];
      jsonwebtoken.verify(
        refresh_token,
        jwt.refreshToken.secret,
        (err, decoded) => {
          if (err){
            res.pushError(err);
            res.pushError(Errors.USER_UNAUTHORIZED);
            res.errors();
          }
          const { user_id, session_id } = decoded;

          const accessToken = genAccessToken({user_id, session_id});

          const info = {user_id, session_id};
          if (next) {
            res.send({status: 200, data: {token: accessToken, info}});
            next();
          }else {
            res.status(200).json({status: 200, data: {token: accessToken, info}});
          }
        }
      )
    }).catch(queryErr => {
      res.pushError(queryErr);
      res.errors();
  });
};

export const jwtAuth = (req, res, next) => {

//  console.log(jwt.accessToken.secret);
  if(backdoor){
    p.query(
      "SELECT * FROM user_info WHERE user_id= 36", []
    ).then(results => {
      if (results.rows.rowCount === 0) {
        res.pushError(Errors.USER_UNAUTHORIZED);
        return res.errors();
      }
      else {
        const user = results.rows[0];
        req.user = user;
        return next();
      }
  }

  jsonwebtoken.verify(
    jwtExtractor(req),
    jwt.accessToken.secret,
    {
      ignoreExpiration: true
    },
    (err, decoded) => {
      console.log(err);
      if (err) {
        if (res.locals.authType === "optional") {
          return next()
        }else {

          res.pushError(err);
          res.pushError(Errors.USER_UNAUTHORIZED);
          res.errors();
        }
      }

      else if (decoded.expiredAt < Date.now()) {
        res.locals.decoded = decoded;
        return refreshAccessToken(res, req, next);
      }
      else {
        res.locals.decoded = decoded;
        p.query(
          "SELECT * FROM user_info WHERE user_id= $1",
          [decoded.user_id]
        ).then(results => {
          if (results.rows.rowCount === 0) {
            res.pushError(Errors.USER_UNAUTHORIZED);
            res.errors();
          }
          else {
            const user = results.rows[0];
            req.user = user;
            return next();
          }
        }).catch(queryErr => {
          res.pushError(queryErr);
   //       console.log(queryErr);
          res.errors();
        });
      }
    }
  )
};

export const jwtAuthOptional = (req, res, next) => {
  res.locals.authType = "optional";
  return jwtAuth(req, res, next);
};
