import React,{useState, useContext} from 'react';
import './Login.css'; // Link to the provided CSS file
import { Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios.js';
import {UserContext} from '../context/user.context.jsx'
const Login = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const {setUser} = useContext(UserContext)

  const navigate = useNavigate()

  function submitHandler(e) {

    e.preventDefault()

    axios.post('/users/login',{
      email,
      password,
    }).then((res) =>{
      console.log(res.data);

      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      
      navigate('/')
    }).catch((err) =>{
      console.log(err.response.data);
    })
  }
  return (
    <div className='gradient-background'>
    <div className="login-box">
      <h2>Login</h2>
      <form
      onSubmit={submitHandler}
      >
        <div className="user-box">
          <input onChange={(e) => setEmail(e.target.value)} type="email" name="email" required />
          <label>Email</label>
        </div>
        <div className="user-box">
          <input onChange={(e) => setPassword(e.target.value)} type="password" name="password" required />
          <label>Password</label>
        </div>
        <button className="submit-btn">
          Submit
        </button>
      </form>
      <p className="create-account">
        Don’t have an account? <Link to="/register">Create one</Link>
      </p>
    </div>
    </div>
  );
};

export default Login;
