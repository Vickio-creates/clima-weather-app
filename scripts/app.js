document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
});

function updateCity(){
  let input = document.querySelector("#city-input");
  let city = input.value;

  if(city === ""){
    alert("Please enter a city");
    return;
  }

  document.querySelector("#city-name").textContent = city;
  input.value = "";
}

//Function to press Enter button on the keyboard
function handleEnter(event){
  if(event.key === "Enter"){
    updateCity();
  }
}