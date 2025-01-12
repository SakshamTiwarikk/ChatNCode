import React, {useState, useContext} from 'react';
import { UserContext } from '../context/user.context.jsx';
import './Register.css'; // Link to a new CSS file for different styles
import  { Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios.js'
const Register = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const {setUser}  =useContext(UserContext);

  function submitHandler(e) {

    e.preventDefault()

    axios.post('/users/register',{
      email,
      password,
    }).then((res) =>{
      console.log(res.data);
      localStorage.setItem('token' , res.data.token);
      setUser(res.data.user);
      navigate('/');
    }).catch((err) =>{
      console.log(err.response.data);
    })
  }
  return (
    <div className='gradient-background'>
    <div className="register-box">
      <h2>Register</h2>
      <form
      onSubmit={submitHandler}
      >
        <div className="user-box">
          <input  type="text" name="username" required />
          <label>Username</label>
        </div>
        <div className="user-box">
          <input  onChange={(e) => setEmail(e.target.value)} type="email" name="email" required />
          <label>Email</label>
        </div>
        <div className="user-box">
          <input  onChange={(e) => setPassword(e.target.value)} type="password" name="password" required />
          <label>Password</label>
        </div>
        <div className="user-box">
          <input type="password" name="confirm-password" required />
          <label>Confirm Password</label>
        </div>
        <button type="submit" className="submit-btn">
          Register
        </button>
      </form>
      <p className="login-account">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
    </div>
  );
};

export default Register;
