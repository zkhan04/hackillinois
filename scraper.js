const getPageText = () => {
    const content = document.querySelector("#content");
    console.log(content.innerText);
    return context.innerText;
}

export {getPageText}