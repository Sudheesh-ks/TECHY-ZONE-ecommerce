

const cropperInstances = [];
const croppedImages = [];
let currentImageIndex = null;


const name = document.getElementById("productName");
const description = document.getElementById("productDescription");
const categorySelect = document.getElementById("productCategory");
const ogPrice = document.getElementById("productOgPrice");
const offerPrice = document.getElementById("productOfferPrice");
const stock = document.getElementById("productStock");
const warranty = document.getElementById("productWarranty");
const returnPolicy = document.getElementById("productReturnPolicy");

const nameRegex = /^[a-zA-Z0-9 ]{3,}$/;
const priceRegex = /^\d+(\.\d{1,2})?$/;
const stockRegex = /^\d+$/;
const textRegex = /^[a-zA-Z0-9 ]+$/;
const tagsRegex = /^(#\w+)(\s#\w+)*$/;

function previewAndCrop(event, index) {
    const file = event.target.files[0];
    if (!file)  return 

    const allowedType = ["image/png", "image/gif", "image/jpeg"]
    console.log(allowedType.includes(file.type))
    if(!allowedType.includes(file.type)){
        showError(event.target, "Invalid file type. Please select a valid image.");
        event.target.files[0]=null
        event.target.value=null
        return 
    }
    const cropPreview = document.getElementById(`cropPreview${index}`);
    const cropPreviewSection = document.getElementById(`cropPreviewSection${index}`);

    cropPreview.src = URL.createObjectURL(file);
    cropPreviewSection.style.display = "block";
    if (cropperInstances[index]) {
        cropperInstances[index].destroy();
    }
    cropperInstances[index] = new Cropper(cropPreview, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        scalable: true,
        zoomable: true,
        movable: true,
    });

    currentImageIndex = index;
}


function startCropping(index) {

    if (!cropperInstances[index]) {
        showError("Please select an image to crop.");
        return;
    }


    if (cropperInstances[index]) {
      const cropper = cropperInstances[index];
      const canvas = cropper.getCroppedCanvas();
  
      if (canvas) {
        canvas.toBlob((blob) => {
          const croppedImageFile = new File([blob], `croppedImage${index + 1}.png`, {
            type: "image/png",
            lastModified: Date.now(),
          });
          croppedImages[index] = croppedImageFile;
  
          document.getElementById(`cropPreviewSection${index}`).style.display = "none";
  
          const croppedPreviewContainer = document.getElementById(`croppedImagePreview${index}`);
          croppedPreviewContainer.innerHTML = ""; 
          const croppedImgElement = document.createElement("img");
          croppedImgElement.src = URL.createObjectURL(croppedImageFile);
          croppedImgElement.style.width = "100px"; 
          croppedImgElement.style.height = "100px";
          croppedImgElement.style.marginTop = "10px";
          croppedImgElement.style.border = "1px solid #ddd";
          croppedImgElement.style.borderRadius = "8px";
          croppedPreviewContainer.appendChild(croppedImgElement);
  
          currentImageIndex = null;
        });
      } else {
        alert(`Could not retrieve the cropped canvas for index: ${index}`);
      }
    } else {
      alert("Please select an image to crop.");
    }
  }
  
function validateAndSubmit() {
    const errorMsgs = document.querySelectorAll(".error-message");
    errorMsgs.forEach((error) => error.remove());

    if (!nameRegex.test(name.value)) {
        showError(name, "Product name must be at least 3 characters long and alphanumeric.");
    } else if (description.value.length < 5) {
        showError(description, "Description must be at least 5 characters long.");
    } else if (categorySelect.value === "") {
        showError(categorySelect, "Please select a category.");
    } else if (!priceRegex.test(ogPrice.value)) {
        showError(ogPrice, "Original Price must be a valid number with up to 2 decimal places.");
    } else if (!priceRegex.test(ogPrice.value) || parseFloat(ogPrice.value) <= 0) {
        showError(ogPrice, "Original Price must be a positive number with up to 2 decimal places.");
    } else if (offerPrice.value !== "" && (!priceRegex.test(offerPrice.value) || parseFloat(offerPrice.value) <= 0)) {
        showError(offerPrice, "Offer Price must be a positive number with up to 2 decimal places.");
    } else if (offerPrice.value !== "" && parseFloat(offerPrice.value) > parseFloat(ogPrice.value)) {
        showError(offerPrice, "Offer Price cannot be greater than the Original Price.");
    } else if (!stockRegex.test(stock.value) || stock.value < 1) {
        showError(stock, "Stock must be a positive integer.");
    } else {
        const formData = new FormData();
        formData.append("name", name.value);
        formData.append("description", description.value);
        formData.append("category", categorySelect.value);
        formData.append("price", parseFloat(ogPrice.value));
        formData.append("offerPrice", offerPrice.value !== "" ? offerPrice.value : null);
        formData.append("stock", parseInt(stock.value));
        formData.append("warranty", warranty.value !== "" ? warranty.value : null);
        formData.append("returnPolicy", returnPolicy.value !== "" ? returnPolicy.value : null);
        console.log(croppedImages)
        croppedImages.forEach((croppedImage,i) => {
            console.log(i)
            if (croppedImage) {
                formData.append(`productImage${i + 1}`, croppedImage);
            }
        });

        (async function addData() {
            try {
                const response = await fetch("/admin/products/add", {
                    method: "POST",
                    body: formData,
                });
                const data = await response.json();
                console.log(data.msg);
                console.log(data.val)
                if(data.val){
                    window.location.href = "/admin/addProducts";
                }
            } catch (err) {
                console.log("Error ::- " + err);
            }
        })();
    }
}

function showError(input, message) {
    const error = document.createElement("p");
    error.className = "error-message";
    error.style.color = "red";
    error.textContent = message;
    input.parentElement.appendChild(error);
}
document.querySelector(".btn-CreateProduct").addEventListener("click", (event) => {
    event.preventDefault();
    validateAndSubmit();
});
function toggleOfferPriceInput() {
    const offerPriceDiv = document.getElementById("offerPriceDiv");
    const checkbox = document.getElementById("toggleOfferPrice");
    offerPriceDiv.style.display = checkbox.checked ? "block" : "none";
}
function toggleWarrantyInput() {
    const warrantyDiv = document.getElementById("warrantyDiv");
    warrantyDiv.style.display = warrantyDiv.style.display === "none" ? "block" : "none";
}
function toggleReturnPolicyInput() {
    const returnPolicyDiv = document.getElementById("returnPolicyDiv");
    returnPolicyDiv.style.display = returnPolicyDiv.style.display === "none" ? "block" : "none";
}


