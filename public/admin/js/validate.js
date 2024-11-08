console.log('shhs')

const cropperInstances = [];
const croppedImages = [];
let currentImageIndex = null;


const name = document.getElementById("productName");
const description = document.getElementById("productDescription");
const categorySelect = document.getElementById("productCategory");
const brand = document.getElementById("productBrand");
const ogPrice = document.getElementById("productOgPrice");
const offerPrice = document.getElementById("productOfferPrice");
const stock = document.getElementById("productStock");
const tags = document.getElementById("productTags");
const warranty = document.getElementById("productWarranty");
const returnPolicy = document.getElementById("productReturnPolicy");
const cashOnDelivery = document.getElementById("cashOnDelivery");

const nameRegex = /^[a-zA-Z0-9 ]{3,}$/;
const priceRegex = /^\d+(\.\d{1,2})?$/;
const stockRegex = /^\d+$/;
const textRegex = /^[a-zA-Z0-9 ]+$/;
const tagsRegex = /^(#\w+)(\s#\w+)*$/;

function previewAndCrop(event, index) {
    const file = event.target.files[0];
    if (!file) return;

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


const colorsOption = [];

function addColor() {
    const colorPicker = document.getElementById("colorPicker");
    const selectedColor = colorPicker.value;
    if (!colorsOption.includes(selectedColor)) {
        colorsOption.push(selectedColor);
        const colorCircle = document.createElement("div");
        colorCircle.style.width = "20px";
        colorCircle.style.height = "20px";
        colorCircle.style.backgroundColor = selectedColor;
        colorCircle.style.borderRadius = "50%";
        colorCircle.style.display = "inline-block";
        colorCircle.style.margin = "5px";
        document.getElementById("showColors").appendChild(colorCircle);
    }
    console.log(colorsOption)
    colorPicker.value = "#ffffff";
}


const selectedSizes = [];

function updateSelectedSizes() {
    selectedSizes.length = 0;
    const checkboxes = document.querySelectorAll('.form-check-input');
    checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            selectedSizes.push(checkbox.value);
        }
    });
    console.log(selectedSizes);
}

function startCropping(index) {
    console.log('AA')
    if (cropperInstances[index]) {
        const cropper = cropperInstances[index];
        const canvas = cropper.getCroppedCanvas();

        if (canvas) {
            canvas.toBlob((blob) => {
                const croppedImageFile = new File(
                    [blob],
                    `croppedImage${index + 1}.png`,
                    {
                        type: "image/png",
                        lastModified: Date.now(),
                    }
                );
                croppedImages[index] = croppedImageFile;

                document.getElementById(`cropPreviewSection${index}`).style.display = "none";
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
        //   } else if (!tagsRegex.test(tags.value)) {
        //     showError(tags, "Tags should start with #, have letters or numbers, and be separated by spaces.");
        //   } else if (!textRegex.test(brand.value)) {
        //     showError(brand, "Brand name must be alphanumeric.");
    } else if (!priceRegex.test(ogPrice.value)) {
        showError(ogPrice, "Original Price must be a valid number with up to 2 decimal places.");
    } else if (!stockRegex.test(stock.value) || stock.value < 1) {
        showError(stock, "Stock must be a positive integer.");
    } else {
        const formData = new FormData();
        formData.append("name", name.value);
        formData.append("description", description.value);
        formData.append("category", categorySelect.value);
        // formData.append("brand", brand.value);
        formData.append("price", parseFloat(ogPrice.value));
        // formData.append("tags", tags.value);
        // formData.append("sizes", selectedSizes);
        // formData.append("colors", colorsOption);
        formData.append("cashOnDelivery", cashOnDelivery.checked);
        formData.append("offerPrice", offerPrice.value !== "" ? offerPrice.value : null);
        formData.append("stock", parseInt(stock.value));
        formData.append("warranty", warranty.value !== "" ? warranty.value : null);
        formData.append("returnPolicy", returnPolicy.value !== "" ? returnPolicy.value : null);
        // console.log(index)
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

