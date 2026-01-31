import "./Header.css"
import { NavLink } from "react-router-dom"

export default function Header(props) {
    return (
        <div>
            {
            props.page == "pay" ? 
                <header>
                    <NavLink to={props.back} className="back-btn">
                    ← Back to Receipt
                    </NavLink>
                    <h2>Divvy</h2>
                </header>
                :
                <header>
                    <h2>Divvy</h2>
                    <NavLink to={"/"}>
                        Home
                    </NavLink>
                </header>
                
            }
        </div>
    )
}