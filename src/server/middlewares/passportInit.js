import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import FacebookStrategy from 'passport-facebook';
import jsonwebtoken from 'jsonwebtoken';
import { passportStrategy, jwt } from '../../config/index';
import p from '../utils/agents';

const GoogleStrategy = require('passport-google-oauth20').Strategy;

export default (req, res, next) => {

  const findUser = (schemaProfileKey, id, cb) => {
    p.query(`SELECT * FROM user_info WHERE ${schemaProfileKey}_agent_id = $1`,
      [id]
    ).then( results => {
      const userFound = results.rows;
      console.log('testing');
      console.log(userFound);
      return cb(null, userFound);
    })
      .catch( err => {
        console.log(err);
        return cb(err);
      });
  };

  const jwtExtractor = () => req.query.env === "native" ?
    ExtractJwt.fromAuthHeaderWithScheme('bearer'):
      req.store.getState().cookies.token;


  const genToken = data => {
    console.log(JSON.parse(JSON.stringify(data)));
    console.log(jwt.authentication.secret);
    console.log(jwt.authentication.expiresIn);
    return jsonwebtoken.sign(JSON.parse(JSON.stringify(data)), jwt.authentication.secret, {
      expiresIn: jwt.authentication.expiresIn
    });
   };

  const mapProfile = (platform, profile, createTime) => {
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
          login_time: createTime,
          create_time: createTime
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
          login_time: createTime,
          create_time: createTime
        };
        break;
      default:
        throw new Error("Please specify a correct platform name")
    }
    const keys = [];
    const values = [];
    for (const k in user) {
      keys.push(k);
      values.push(user[k]);
    }
    return {
      query: `INSERT INTO user_Info (${keys.join(',')}) VALUES ('${values.join("','")}')`,
      user
    };
  };

  const loginOrCreate = (platform, userFound, profile, done) => {
    if (userFound.length === 0){
      console.log('user not found');
      const createTime = new Date();
      const params = mapProfile(platform, profile, createTime);
      let { user } = params;
      p.transaction(conn =>
        p.query(params.query)
          .then(insertResult => {
            const lastId = insertResult.rows[0].id;
            const lastIdStr = `${lastId}`;
            const pad = (`U00000000`).slice(0, -lastIdStr.length);
            const userId = `${pad}${lastIdStr}`;
            const token = genToken({ userId, loginTime: createTime });
            user = { userId, token, ...user };
            return p.query(
              "UPDATE user_info SET user_id = $1, token = $2 WHERE id = $3",
              [userId, token, lastId])
          })
      ).then(() => {
        done(null, { user })
      }).catch((errs) => {
        done(errs, null);
      });
    }
    else {
      console.log('user found');
      const user = userFound[0];
      const userId = user.user_id;
      const loginTime = new Date();
      const token = genToken( { userId, loginTime } );
      p.query(
        "UPDATE user_info SET login_time=$1, token=$2 WHERE user_id=$3",
        [loginTime, token, userId]
      ).then(() => {
        console.log('case 2');
        user.token = token;
        user.login_time = loginTime;
        const data = {...user};
        delete data.user_password;
        done(null, data );
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
          console.log('bingo 2');
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

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: jwtExtractor,
        secretOrKey: jwt.authentication.secret
      },
      (jwtPayload, done) => {
        // this callback is invoked only when jwt is correctly decoded
        console.log(jwtPayload);
        p.query(
          "SELECT * FROM user_info WHERE user_id= $1",
          [jwtPayload.userId]
        ).then(user => {
            console.log(user);
            return done(null, user, jwtPayload);
          }
        )
        .catch(err => {
          console.log(err);
          return done(err, null, jwtPayload);
        });
      }
    )
  );

  // Serialize user into the sessions
  passport.serializeUser((user, done) => done(null, user));

  // Deserialize user from the sessions
  passport.deserializeUser((user, done) => done(null, user));

  passport.initialize()(req, res, next);
  // passport.session()(req, res, next)

};