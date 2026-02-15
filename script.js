
document.addEventListener("DOMContentLoaded",()=>{
    const images = document.querySelectorAll(".ORCA");
    images.forEach((img)=>{
        img.addEventListener("click",()=>{
            const arr = Array.from(img.classList).find(c =>c.endsWith("inf"));
            const info = arr.replace("inf","Inf");
            const text = document.getElementById(info);
            if(!text){
                return
            }
            text.classList.toggle("hidden");
        });
      

    });

});