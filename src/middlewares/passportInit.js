import passport from 'passport';
import FacebookStrategy from 'passport-facebook';
import { genAccessToken, genRefreshToken } from '../utils/tokenHelper'
import { passportStrategy, jwt } from '../config/index';
import p from '../utils/agents';

const uuidv4 = require('uuid/v4');

const GoogleStrategy = require('passport-google-oauth20').Strategy;

export default (req, res, next) => {

  const findUser = (schemaProfileKey, id, cb) => {
    p.query(`SELECT * FROM user_info WHERE ${schemaProfileKey}_agent_id = $1`,
      [id]
    ).then( results => {
      const userFound = results.rows;
      return cb(null, userFound);
    })
    .catch( err => {
 //     console.log(err);
      return cb(err);
    });
  };


  const mapProfile = (platform, profile) => {
    let user;
    switch(platform){
      case "facebook":
        user = {
          facebook_agent_id: profile._json.id,
          email: profile._json.email,
          gender: profile._json.gender,
          age: profile._json.age,
          display_name: profile._json.name,
          given_name: profile._json.first_name,
          middle_name: profile._json.middle_mame,
          family_name: profile._json.last_name,
          avatar_url: profile._json.picture.data.url,
        };
        break;
      case "google":
        user = {
          google_agent_id: profile._json.id,
          email: profile._json.email,
          gender: profile._json.gender,
          age: profile._json.age,
          display_name: profile._json.displayName,
          given_name: profile._json.name.givenName,
          family_name: profile._json.familyName,
          avatar_url: profile._json.image.url,
        };
        break;
      default:
        throw new Error("Please specify a correct platform name")
    }
    const keys = [];
    const values = [];
  //  console.log(user);
    for (const k in user) {
      if (typeof user[k] !== "undefined") {
        keys.push(k);
        values.push(user[k]);
      }
    }
    return {
      query: `INSERT INTO user_Info (${keys.join(',')}, last_login_time, create_time) VALUES ('${values.join("','")}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      user
    };
  };

  const loginOrCreate = (platform, userFound, profile, done) => {

    if (userFound.length === 0){
      console.log('user not found');
      const params = mapProfile(platform, profile);

      p.transaction(conn =>
        p.query(params.query)
          .then(insertResult => {
            const lastId = insertResult.rows[0].id;
            const lastIdStr = `${lastId}`;
            const pad = (`U00000000`).slice(0, -lastIdStr.length);
            const session_id = uuidv4();
            const refresh_token = genRefreshToken({ session_id });
            const user_id = `${pad}${lastIdStr}`;
            return Promise.all([
              p.query(
              "UPDATE user_info SET user_id = $1 WHERE id = $2 RETURNING user_id",
              [user_id, lastId]),
              p.query(
                "INSERT INTO session (user_id, session_id, refresh_token ,login_time, create_time ) " +
                "VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) " +
                "RETURNING session_id, refresh_token",
                [user_id, session_id, refresh_token])
              ]);
          })
      ).then(values => {
        const [results, results2] = values;
        const { user_id } = results.rows[0];
        const { session_id, refresh_token } = results2.rows[0];
        const access_token = genAccessToken({ user_id, session_id });
        const info = { user_id, session_id, avatarUrl: params.user.avatar_url };
        const data = {token: access_token, info};
        done(null, data )
      }).catch(err => {
        res.pushError(err);
        res.error();
      });
    }
    else {
      console.log('user found');
      const user = userFound[0];
      const { user_id } = user;
      const session_id = uuidv4();
      const refresh_token = genRefreshToken({ session_id });
      Promise.all([
        p.query(
        "UPDATE user_info SET last_login_time=CURRENT_TIMESTAMP WHERE user_id=$1 " +
        "RETURNING last_login_time",
        [user_id]
      ),
        p.query(
          "INSERT INTO session (user_id, session_id, refresh_token, login_time, create_time ) " +
          "VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
          [user_id, session_id, refresh_token ])
      ])
      .then(() => {
        const access_token = genAccessToken( { user_id, session_id } );
        console.log('case 2');
        const info = { user_id, session_id, avatarUrl: userFound[0].avatar_url };
        const data = {token: access_token, info};
        done(null, data);
      })
        .catch(_err => {
          console.log(_err);
        });
    }
  };

  if (passportStrategy.facebook) {
    passport.use(
      new FacebookStrategy(
        {
          ...passportStrategy.facebook,
          profileFields: [
            'id', 'displayName', 'first_name', 'middle_name',
            'last_name', 'gender', 'photos', 'email'
          ]
        },
        (_req, accessToken, refreshToken, profile, done) => {
          findUser(
            'facebook',
            profile._json.id,
            (err, userFound) => {
              loginOrCreate('facebook', userFound, profile, done);
            })
        }
      )
    );
  }

  if (passportStrategy.google) {
    passport.use(
      new GoogleStrategy(
        passportStrategy.google,
        (_req, accessToken, refreshToken, profile, done) => {
          findUser(
            'google',
            profile._json.id,
            (err, userFound) => {
              loginOrCreate('google', userFound, profile, done);
            })
        }
      )
    );
  }

  passport.initialize()(req, res, next);


};
