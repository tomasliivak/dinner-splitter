import "./header.css"
import { NavLink } from "react-router-dom"

export default function Header() {
    return (
        <header >
            <h2>Divvy</h2>
            <NavLink to={"/"}>
                Home
            </NavLink>
        </header>
    )
}