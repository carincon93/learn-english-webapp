import "../../shared/styles/Button.css";

export default function Button() {
    return (
        <div className="button-wrap">
            <button className="button">
                <span>Generate</span>
            </button>
            <div className="button-shadow"></div>
        </div>
    )
}