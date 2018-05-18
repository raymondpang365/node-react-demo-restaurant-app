/* @flow */

import React from 'react';

import { Link } from 'react-router-dom';

import styles from '../../styles/components/_UserList.scss';

type Props = { list: Array<Object> };

export default ({ list }: Props) => (
  <div className={styles.UserList}>
    <h4>User List</h4>
    <ul>
      {list.map(user => (
        <li key={user.id}>
          <Link to={`/UserInfo/${user.id}`}>{user.name}</Link>
        </li>
      ))}
    </ul>
  </div>
);