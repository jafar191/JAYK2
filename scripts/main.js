(function() {
  /******************************************************************
   *                دوال عامة (نسخ رقم الطلب، إظهار الخطأ، إلخ)
   ******************************************************************/
  function copyOrderNumber(orderNumber) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(orderNumber).then(() => {
        Swal.fire({
          toast: true,
          position: 'bottom',
          icon: 'success',
          title: 'تم نسخ رقم الطلب الى الحافظة',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = orderNumber;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      Swal.fire({
        toast: true,
        position: 'bottom',
        icon: 'success',
        title: 'تم نسخ رقم الطلب الى الحافظة',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
    }
  }
  window.copyOrderNumber = copyOrderNumber;

  function showError(message) {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
      setTimeout(() => (errorDiv.style.display = "none"), 3000);
    } else {
      alert(message);
    }
  }

  function logout() {
    localStorage.removeItem("currentUser");
    firebase.auth().signOut()
      .then(() => { window.location.href = "index.html"; })
      .catch(() => { Swal.fire("خطأ", "حدث خطأ أثناء تسجيل الخروج", "error"); });
  }
  window.logout = logout;

  /******************************************************************
   *         فتح وإغلاق القائمة الجانبية + البحث عن الطلب
   ******************************************************************/
  function openSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar && overlay) { 
      sidebar.classList.add("open"); 
      overlay.classList.add("show"); 
    }
  }
  window.openSidebar = openSidebar;

  function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar && overlay) { 
      sidebar.classList.remove("open"); 
      overlay.classList.remove("show"); 
    }
  }
  window.closeSidebar = closeSidebar;

  function searchOrder() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    Swal.fire({
      title: "ابحث عن الطلب",
      input: "text",
      inputLabel: "ادخل رقم الطلب أو رقم الزبون",
      showCancelButton: true,
      confirmButtonText: "بحث",
      cancelButtonText: "إلغاء",
      inputValidator: (value) => {
        if (!value) return "يرجى إدخال رقم الطلب أو رقم الزبون";
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const searchValue = result.value.trim();
        const queries = [];

        // البحث باستخدام رقم الطلب (إذا كانت القيمة رقمية)
        const orderNumber = parseInt(searchValue, 10);
        if (!isNaN(orderNumber)) {
          let orderQuery = firebase.firestore().collection("orders");
          if (currentUser && currentUser.type === "merchant") {
            orderQuery = orderQuery.where("merchantId", "==", currentUser.uid);
          }
          queries.push(
            orderQuery.where("orderNumber", "==", orderNumber).get()
          );
        }
        // البحث باستخدام رقم الزبون
        let phoneQuery = firebase.firestore().collection("orders");
        if (currentUser && currentUser.type === "merchant") {
          phoneQuery = phoneQuery.where("merchantId", "==", currentUser.uid);
        }
        queries.push(
          phoneQuery.where("phone", "==", searchValue).get()
        );

        Promise.all(queries)
          .then((snapshots) => {
            let foundDoc = null;
            snapshots.forEach((snapshot) => {
              if (!snapshot.empty && !foundDoc) {
                foundDoc = snapshot.docs[0];
              }
            });
            if (foundDoc) {
              openOrderDetailsModal(foundDoc.id);
            } else {
              Swal.fire("خطأ", "لا يوجد طلب بهذا الرقم، يرجى التأكد من الرقم", "error");
            }
          })
          .catch(() => {
            Swal.fire("خطأ", "حدث خطأ أثناء البحث عن الطلب", "error");
          });
      }
    });
  }
  window.searchOrder = searchOrder;

  /******************************************************************
   *            إنشاء حساب جديد (تاجر أو مندوب)
   ******************************************************************/
  function openCreateAccountModal() {
    const modalHTML = `
      <div class="modal-overlay" id="createAccountModal">
        <div class="modal-content">
          <h2>إنشاء حساب جديد</h2>
          <div style="display: flex; justify-content: center; margin-bottom: 15px;">
            <button type="button" id="merchantOption" class="option active" style="padding: 10px 20px; margin-right: 10px;">تاجر</button>
            <button type="button" id="driverOption" class="option" style="padding: 10px 20px;">مندوب</button>
          </div>
          <form id="createAccountForm">
            <div class="form-group">
              <input type="text" id="accountNameInput" placeholder="اسم المتجر" required>
            </div>
            <div class="form-group">
              <input type="email" id="accountEmailInput" placeholder="البريد الإلكتروني" required>
            </div>
            <div class="form-group">
              <input type="password" id="accountPasswordInput" placeholder="كلمة المرور" required>
            </div>
            <div class="form-group">
              <input type="text" id="accountPhoneInput" placeholder="رقم الهاتف" required>
            </div>
            <div class="form-group">
              <input type="text" id="accountDeliveryAddressInput" placeholder="عنوان الاستلام" required>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn cancel" onclick="closeCreateAccountModal()">إلغاء</button>
              <button type="submit" class="btn submit">إنشاء الحساب</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    let selectedAccountType = "merchant";
    const merchantOption = document.getElementById("merchantOption");
    const driverOption = document.getElementById("driverOption");
    merchantOption.addEventListener("click", () => {
      selectedAccountType = "merchant";
      merchantOption.classList.add("active");
      driverOption.classList.remove("active");
      document.getElementById("accountNameInput").placeholder = "اسم المتجر";
    });
    driverOption.addEventListener("click", () => {
      selectedAccountType = "driver";
      driverOption.classList.add("active");
      merchantOption.classList.remove("active");
      document.getElementById("accountNameInput").placeholder = "اسم المندوب";
    });
    document.getElementById("createAccountForm").addEventListener("submit", function (e) {
      e.preventDefault();
      handleCreateAccount(selectedAccountType);
    });
  }
  window.openCreateAccountModal = openCreateAccountModal;

  function closeCreateAccountModal() {
    const modal = document.getElementById("createAccountModal");
    if(modal) modal.remove();
  }
  window.closeCreateAccountModal = closeCreateAccountModal;

  async function handleCreateAccount(accountType) {
    const accountName = document.getElementById("accountNameInput").value;
    const accountEmail = document.getElementById("accountEmailInput").value;
    const accountPassword = document.getElementById("accountPasswordInput").value;
    const accountPhone = document.getElementById("accountPhoneInput").value;
    const accountDeliveryAddress = document.getElementById("accountDeliveryAddressInput").value;
    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(accountEmail, accountPassword);
      const user = userCredential.user;
      if (accountType === "merchant") {
        await firebase.firestore().collection("merchants").doc(user.uid).set({
          storeName: accountName,
          email: accountEmail,
          phone: accountPhone,
          deliveryAddress: accountDeliveryAddress
        });
        Swal.fire({ icon: "success", title: "تم إنشاء حساب التاجر بنجاح" });
      } else if (accountType === "driver") {
        await firebase.firestore().collection("drivers").doc(user.uid).set({
          name: accountName,
          email: accountEmail,
          phone: accountPhone,
          type: "driver",
          driverId: user.uid,
          deliveryAddress: accountDeliveryAddress
        });
        Swal.fire({ icon: "success", title: "تم إنشاء حساب المندوب بنجاح" });
      }
      closeCreateAccountModal();
    } catch (error) {
      Swal.fire({ icon: "error", title: "خطأ في إنشاء الحساب: " + error.message });
    }
  }
  window.handleCreateAccount = handleCreateAccount;

  /******************************************************************
   *         تسجيل الدخول + دعم التخزين المحلي (Local Storage)
   ******************************************************************/
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value.trim().toLowerCase();
      const password = document.getElementById("password").value;
      try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const merchantDoc = await firebase.firestore().collection("merchants").doc(user.uid).get();
        if (merchantDoc.exists) {
          const data = merchantDoc.data();
          const currentUser = {
            uid: user.uid,
            email,
            password,
            name: data.storeName || "بدون اسم",
            phone: data.phone || "لا يوجد",
            deliveryAddress: data.deliveryAddress || "",
            type: "merchant"
          };
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
          window.location.href = "dashboard.html";
          return;
        }
        const driverDoc = await firebase.firestore().collection("drivers").doc(user.uid).get();
        if (driverDoc.exists) {
          const data = driverDoc.data();
          const currentUser = {
            uid: user.uid,
            email,
            password,
            name: data.name || "بدون اسم",
            phone: data.phone || "لا يوجد",
            deliveryAddress: data.deliveryAddress || "",
            type: "driver",
            driverId: data.driverId || user.uid
          };
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
          window.location.href = "driver.html";
          return;
        }
        showError("الحساب غير مسجل كتاجر أو مندوب!");
      } catch {
        showError("بيانات الدخول غير صحيحة أو الحساب غير موجود!");
      }
    });
  }

  function saveOrdersToLocalStorage(key, orders) {
    localStorage.setItem(key, JSON.stringify(orders));
  }
  function loadOrdersFromLocalStorage(key) {
    const ordersData = localStorage.getItem(key);
    if (ordersData) {
      const orders = JSON.parse(ordersData);
      renderOrders(orders);
    } else {
      Swal.fire("تنبيه", "لا توجد بيانات محفوظة محلياً", "info");
      renderOrders([]);
    }
  }

  window.addEventListener('offline', () => {
    console.log("تم قطع الاتصال بالإنترنت، سيتم تحميل البيانات من التخزين المحلي");
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser) {
      if (currentUser.type === "merchant") {
        loadOrdersFromLocalStorage("merchantOrders");
      } else if (currentUser.type === "driver") {
        loadOrdersFromLocalStorage("driverOrders");
      }
    }
  });

  /******************************************************************
   *           تهيئة لوحة التاجر ولوحة المندوب + تحميل الطلبات
   ******************************************************************/
  function initMerchantDashboard() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.type !== "merchant") {
      window.location.href = "index.html";
      return;
    }
    document.getElementById("storeName").textContent = currentUser.name;
    setupTabs();
    loadOrdersForMerchant();
    const statsBtn = document.getElementById("openStatistics");
    if (statsBtn) {
      statsBtn.addEventListener("click", openStatistics);
    }
  }

  function initDriverDashboard() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.type !== "driver") {
      window.location.href = "index.html";
      return;
    }
    document.getElementById("driverName").textContent = currentUser.name;
    document.getElementById("driverEmail").textContent = currentUser.email;
    setupTabs();
    loadOrdersForDriver();
  }

  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (currentUser.type === "merchant") {
          loadOrdersForMerchant();
        } else {
          loadOrdersForDriver();
        }
      });
    });
    updateTabCounts();
  }

  async function updateTabCounts() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const tabs = document.querySelectorAll(".tab-btn");
    for (let tab of tabs) {
      const status = tab.dataset.status;
      let query = firebase.firestore().collection("orders").where("status", "==", status);
      if (currentUser.type === "merchant") {
        query = query.where("merchantId", "==", currentUser.uid);
      }
      const snapshot = await query.get();
      const count = snapshot.size;
      const originalText = tab.getAttribute("data-original-text") || tab.textContent;
      tab.setAttribute("data-original-text", originalText);
      tab.innerHTML = originalText + ` <span class="counter"></span>`;
      
    }
  }

  async function loadOrdersForMerchant() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const status = document.querySelector(".tab-btn.active")?.dataset.status || "فعال";
    try {
      const snapshot = await firebase.firestore().collection("orders")
        .where("merchantId", "==", currentUser.uid)
        .where("status", "==", status)
        .get();
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderOrders(orders);
      updateTabCounts();
      saveOrdersToLocalStorage("merchantOrders", orders);
    } catch (error) {
      console.error("Error fetching merchant orders:", error.message);
      loadOrdersFromLocalStorage("merchantOrders");
    }
  }

  async function loadOrdersForDriver() {
    const status = document.querySelector(".tab-btn.active")?.dataset.status || "فعال";
    try {
      const snapshot = await firebase.firestore().collection("orders")
        .where("status", "==", status)
        .get();
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderOrders(orders);
      updateTabCounts();
      saveOrdersToLocalStorage("driverOrders", orders);
    } catch (error) {
      console.error("Error fetching driver orders:", error.message);
      loadOrdersFromLocalStorage("driverOrders");
    }
  }

  /******************************************************************
   *             عرض الطلبات في الصفحة (بطاقات الطلب)
   ******************************************************************/
  function renderOrders(orders) {
    const container = document.getElementById("ordersTableBody");
    const status = document.querySelector(".tab-btn.active")?.dataset.status || "فعال";

    if (!orders.length) {
      container.innerHTML = `<div class="no-orders-msg">لا توجد طلبات ${status} حاليًا</div>`;
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="order-card" onclick="openOrderDetailsModal('${order.id}')">
        <div class="order-header">
          <span class="order-number" onclick="copyOrderNumber('${order.orderNumber || order.id}'); event.stopPropagation();">
            #${order.orderNumber || order.id}
          </span>
        </div>
        <div class="order-body">
          <div class="customer-info">
            <div class="customer-name">${order.customerName}</div>
            <div class="customer-phone">
              <a href="tel:${order.phone}" style="text-decoration: none; color: inherit;" onclick="event.stopPropagation();">
                <span class="phone-text">${order.phone || 'غير متوفر'}</span>
                <i class="fa fa-phone" style="margin-left: 5px;"></i>
              </a>
            </div>
          </div>
          <div class="order-status">
            <span class="status-badge status-${order.status}">${order.status}</span>
          </div>
        </div>
      </div>
    `).join("");
  }
  window.renderOrders = renderOrders;

  /******************************************************************
   *     إضافة طلب جديد (للتاجر) + إشعار "طلب جديد 🚀"
   ******************************************************************/
  window.openAddOrderModal = function () {
  const modalHTML = `
    <div class="modal-overlay" id="orderModal">
      <div class="modal-content">
        <h2>➕ إضافة طلب جديد</h2>
        <form id="orderForm">
          <div class="form-group floating-label-group">
            <input type="text" id="customerName" placeholder=" " required>
            <label for="customerName">اسم الزبون</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="tel" id="customerPhone" placeholder=" " pattern="07[0-9]{9}" required>
            <label for="customerPhone">رقم الهاتف</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="text" id="customerAddress" placeholder=" " required>
            <label for="customerAddress">العنوان التفصيلي</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="number" id="itemCount" placeholder=" " min="1" required>
            <label for="itemCount">عدد القطع</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="number" id="orderPrice" placeholder=" " min="2000" required>
            <label for="orderPrice">سعر الطلب</label>
            <div class="error-message" id="priceError"></div>
          </div>
          <div class="form-group floating-label-group">
            <textarea id="orderNotes" placeholder=" "></textarea>
            <label for="orderNotes">ملاحظات</label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn cancel" onclick="closeModal()">إلغاء</button>
            <button type="submit" class="btn submit">حفظ الطلب</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // التحقق من سعر الطلب عند إدخاله
  document.getElementById("orderPrice").addEventListener("input", function (e) {
    const priceError = document.getElementById("priceError");
    priceError.textContent = e.target.value < 2000 ? "السعر يجب أن يكون 2000 دينار أو أكثر" : "";
  });

  // التعامل مع حدث إرسال النموذج
  document.getElementById("orderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    handleOrderSubmission();
  });
};

async function handleOrderSubmission() {
  const orderPriceInput = document.getElementById("orderPrice");
  const priceError = document.getElementById("priceError");
  if (orderPriceInput.value < 2000) {
    priceError.textContent = "السعر يجب أن يكون 2000 دينار أو أكثر";
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.type !== "merchant") {
    alert("لا يمكنك إضافة طلب إلا إذا كنت تاجرًا!");
    return;
  }
  const currentUserAuth = firebase.auth().currentUser;
  if (!currentUserAuth) {
    alert("يجب تسجيل الدخول أولاً!");
    return;
  }

  const counterRef = firebase.firestore().collection("counters").doc("ordersCounter");
  let orderNumber;
  await firebase.firestore().runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists) {
      orderNumber = 1;
      transaction.set(counterRef, { count: 1 });
    } else {
      orderNumber = counterDoc.data().count + 1;
      transaction.update(counterRef, { count: orderNumber });
    }
  });

  const newOrder = {
    customerName: document.getElementById("customerName").value,
    phone: document.getElementById("customerPhone").value,
    address: document.getElementById("customerAddress").value,
    items: document.getElementById("itemCount").value,
    price: document.getElementById("orderPrice").value,
    notes: document.getElementById("orderNotes").value || "لا يوجد ملاحظات",
    status: "فعال",
    driverId: "",
    storeName: currentUser.name,
    merchantPhone: currentUser.phone,
    merchantId: currentUser.uid,
    deliveryAddress: currentUser.deliveryAddress || "",
    date: firebase.firestore.FieldValue.serverTimestamp(),
    messages: [],
    orderNumber: orderNumber
  };

  try {
    const orderRef = await firebase.firestore().collection("orders").add(newOrder);
    closeModal();
    loadOrdersForMerchant();
    updateTabCounts();
    storeNotificationCloud(
      "طلب جديد 🚀",
      `تمت إضافة طلب من قبل ${currentUser.name}`,
      { type: "newOrder", orderId: orderNumber || orderRef.id },
      "driver"
    );
    Swal.fire({
      icon: "success",
      title: "تم إضافة الطلب بنجاح",
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error) {
    console.error("Error adding order:", error);
  }
}

window.closeModal = function () {
  const modal = document.getElementById("orderModal");
  if (modal) modal.remove();
};

  /******************************************************************
   *   دوال للتواصل (مع المندوب أو التاجر) تظهر في كل الأقسام
   ******************************************************************/
  function contactDriver(driverPhone) {
    if (!driverPhone) {
      Swal.fire("تنبيه", "لا يوجد رقم للمندوب!", "warning");
      return;
    }
    const whatsappLink = `https://wa.me/${driverPhone}`;
    Swal.fire({
      title: 'تواصل مع المندوب',
      html: `<p>يرجى التواصل مع المندوب على الرقم ${driverPhone}</p>
             <a href="${whatsappLink}" target="_blank">
               <button style="background-color: #25D366; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">واتساب</button>
             </a>`,
      icon: 'info',
      confirmButtonText: 'إغلاق'
    });
  }
  window.contactDriver = contactDriver;

  function contactMerchant(merchantPhone) {
    if (!merchantPhone) {
      Swal.fire("تنبيه", "لا يوجد رقم للتاجر!", "warning");
      return;
    }
    const whatsappLink = `https://wa.me/${merchantPhone}`;
    Swal.fire({
      title: 'تواصل مع التاجر',
      html: `<p>يرجى تواصل مع التاجر على الرقم <strong>${merchantPhone}</strong></p>
             <a href="${whatsappLink}" target="_blank">
               <button style="background-color: #25D366; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">واتساب</button>
             </a>`,
      icon: 'info',
      confirmButtonText: 'إغلاق'
    });
  }
  window.contactMerchant = contactMerchant;

  /******************************************************************
   *  عرض تفاصيل الطلب (مودال) + تمكين التبليغ والتوصيل في كل الأقسام
   ******************************************************************/
  async function openOrderDetailsModal(orderId) {
    try {
      const docSnap = await firebase.firestore().collection("orders").doc(orderId).get();
      if (!docSnap.exists) {
        Swal.fire("خطأ", "لم يتم العثور على الطلب!", "error");
        return;
      }
      const order = { id: docSnap.id, ...docSnap.data() };
      renderOrderDetailsModal(order);
    } catch {
      Swal.fire("خطأ", "حدث خطأ أثناء جلب تفاصيل الطلب", "error");
    }
  }
  window.openOrderDetailsModal = openOrderDetailsModal;

  function renderOrderDetailsModal(order) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
 // كائن يحدد اللون لكل حالة
  const statusColors = {
    "فعال": "#3f4cdb",         // أزرق
    "قيد التوصيل": "25D366",
    "مبلغة": "red",
    "مكتملة": "green"
  };
  // إذا لم تكن الحالة ضمن الكائن، استخدم لون رمادي (#999)
  const badgeColor = statusColors[order.status] || "#999";
    let detailsHTML = `
      <div class="order-details-modal" style="max-width: 450px; margin: auto; border-radius: 8px; overflow: hidden; font-family: 'Tajawal', sans-serif;">
        <div class="modal-header" style="background: #2563eb; color: white; padding: 15px; text-align: center;">
          <h2 style="margin: 0;">تفاصيل الطلب</h2>
        </div>
        <div class="modal-body" style="padding: 15px; background: #f9f9f9;">
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1 1 45%;">
              <p style="margin: 0; color: #555;"><strong>الزبون:</strong></p>
              <p style="margin: 0; font-size: 16px;">${order.customerName || 'بدون اسم'}</p>
            </div>
            <div style="flex: 1 1 45%;">
              <p style="margin: 0; color: #555;"><strong>عدد القطع:</strong></p>
              <p style="margin: 0; font-size: 16px;">${order.items || 1}</p>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <p style="margin: 0; color: #555;"><strong>العنوان:</strong></p>
            <p style="margin: 0; font-size: 16px;">${order.address || 'لا يوجد عنوان'}</p>
          </div>
          <div style="margin-top: 10px;">
            <p style="margin: 0; color: #555;"><strong>الهاتف:</strong></p>
            <p style="margin: 0; font-size: 16px;">
              <a href="tel:${order.phone}" style="color: #2563eb; text-decoration: none;">${order.phone || 'غير متوفر'}</a>
            </p>
          </div>
          <div style="margin-top: 10px;">
            <p style="margin: 0; color: #555;"><strong>السعر (مع التوصيل):</strong></p>
            <p style="margin: 0; font-size: 16px;">${order.price || 0} IQD</p>
          </div>
          <div style="margin-top: 10px;">
            <p style="margin: 0; color: #555;"><strong>الملاحظات:</strong></p>
            <p style="margin: 0; font-size: 16px;">${order.notes || 'لا توجد ملاحظات'}</p>
          </div>
    `;
    

    if (currentUser.type === "driver") {
      detailsHTML += `
        <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
          <p style="margin: 0; color: #555;"><strong>اسم المتجر:</strong></p>
          <p style="margin: 0; font-size: 16px;">${order.storeName || 'غير متوفر'}</p>
        </div>
        <div style="margin-top: 10px;">
          <p style="margin: 0; color: #555;"><strong>هاتف المتجر:</strong></p>
          <p style="margin: 0; font-size: 16px;">
            <a href="tel:${order.merchantPhone}" style="color: #2563eb; text-decoration: none;">${order.merchantPhone || 'غير متوفر'}</a>
          </p>
        </div>
        <div style="margin-top: 10px;">
          <p style="margin: 0; color: #555;"><strong>عنوان الاستلام:</strong></p>
          <p style="margin: 0; font-size: 16px;">${order.deliveryAddress || 'غير متوفر'}</p>
        </div>
      `;
    }
// حقل حالة الطلب بشكل بادج ملوّن
  detailsHTML += `
      <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
        <p style="margin: 0; color: #555;"><strong>حالة الطلب:</strong></p>
        <div style="
          display: inline-block;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          margin: 5px 0 0 0;
          color: #fff;
          background-color: ${badgeColor};
        ">
          ${order.status || 'غير متوفر'}
        </div>
      </div>
  `;
  if (order.status === "مبلغة") {
      detailsHTML += `
        <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px; background: #fff0f0; border-radius: 4px;">
          <p style="margin: 0; color: #d32f2f;"><strong>سبب التبليغ:</strong> ${order.reportReason || 'غير متوفر'}</p>
          <p style="margin: 0; color: #d32f2f;"><strong>ملاحظات التبليغ:</strong> ${order.reportNotes || 'لا توجد ملاحظات'}</p>
        </div>
      `;
    }

    detailsHTML += `
        </div>
        <div class="modal-footer" style="padding: 10px; background: #f1f1f1; text-align: center;">
    `;

    // عرض أزرار حسب نوع المستخدم وحالة الطلب
    if (currentUser.type === "driver") {
      if (order.status === "فعال") {
        detailsHTML += `
          <button id="acceptOrderBtn" class="action-btn accept" style="margin: 5px; padding: 10px 20px; background: #17a2b8; border: none; border-radius: 4px; color: white;">استلام الطلب</button>
          <button id="contactMerchantBtn" class="action-btn contact" style="margin: 5px; padding: 10px 20px; background: #25D366; border: none; border-radius: 4px; color: white;">تواصل مع التاجر</button>
          <button id="closeModalBtn" class="action-btn close" style="margin: 5px; padding: 10px 20px; background: #6c757d; border: none; border-radius: 4px; color: white;">إغلاق</button>
        `;
      } else if (order.status === "قيد التوصيل" || order.status === "مبلغة") {
        detailsHTML += `
          <button id="reportOrderBtn" class="action-btn report" style="margin: 5px; padding: 10px 20px; background: #ffc107; border: none; border-radius: 4px; color: white;">تبليغ</button>
          <button id="deliveredBtn" class="action-btn delivered" style="margin: 5px; padding: 10px 20px; background: #28a745; border: none; border-radius: 4px; color: white;">تم التوصيل</button>
          <button id="contactMerchantBtn" class="action-btn contact" style="margin: 5px; padding: 10px 20px; background: #25D366; border: none; border-radius: 4px; color: white;">تواصل مع التاجر</button>
          <button id="closeModalBtn" class="action-btn close" style="margin: 5px; padding: 10px 20px; background: #6c757d; border: none; border-radius: 4px; color: white;">إغلاق</button>
        `;
      } else if (order.status === "مكتملة") {
        detailsHTML += `
          <button id="reportOrderBtn" class="action-btn report" style="margin: 5px; padding: 10px 20px; background: #ffc107; border: none; border-radius: 4px; color: white;">تبليغ</button>
          <button id="contactMerchantBtn" class="action-btn contact" style="margin: 5px; padding: 10px 20px; background: #25D366; border: none; border-radius: 4px; color: white;">تواصل مع التاجر</button>
          <button id="closeModalBtn" class="action-btn close" style="margin: 5px; padding: 10px 20px; background: #6c757d; border: none; border-radius: 4px; color: white;">إغلاق</button>
        `;
      } else {
        detailsHTML += `
          <button id="closeModalBtn" class="action-btn close" style="margin: 5px; padding: 10px 20px; background: #6c757d; border: none; border-radius: 4px; color: white;">إغلاق</button>
        `;
      }
    } else {
      if (order.status === "فعال") {
        detailsHTML += `
          <button id="editOrderBtn" class="action-btn edit" style="margin: 5px; padding: 10px 20px; background: #007bff; border: none; border-radius: 4px; color: white;">تعديل الطلب</button>
          <button id="deleteOrderBtn" class="action-btn delete" style="margin: 5px; padding: 10px 20px; background: #dc3545; border: none; border-radius: 4px; color: white;">حذف الطلب</button>
        `;
      }
      if (order.status === "مبلغة") {
        detailsHTML += `<button id="processOrderBtn" class="action-btn process" style="margin: 5px; padding: 10px 20px; background: #20c997; border: none; border-radius: 4px; color: white;">معالجة الطلب</button>`;
      }
      detailsHTML += `
        <button id="contactDriverBtn" class="action-btn contact" style="margin: 5px; padding: 10px 20px; background: #25D366; border: none; border-radius: 4px; color: white;">تواصل مع المندوب</button>
        <button id="closeModalBtn" class="action-btn close" style="margin: 5px; padding: 10px 20px; background: #6c757d; border: none; border-radius: 4px; color: white;">إغلاق</button>
      `;
    }

    detailsHTML += `</div></div>`;

    Swal.fire({
      html: detailsHTML,
      showConfirmButton: false,
      customClass: {
        popup: 'swal2-popup-custom'
      }
    });

    setTimeout(() => {
      const closeBtn = document.getElementById("closeModalBtn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => { Swal.close(); });
      }
      if (currentUser.type === "merchant") {
        const editOrderBtn = document.getElementById("editOrderBtn");
        if (editOrderBtn) {
          editOrderBtn.addEventListener("click", () => { openEditOrderModal(order); });
        }
        const deleteOrderBtn = document.getElementById("deleteOrderBtn");
        if (deleteOrderBtn) {
          deleteOrderBtn.addEventListener("click", () => { deleteOrder(order.id); });
        }
        const processOrderBtn = document.getElementById("processOrderBtn");
        if (processOrderBtn) {
          processOrderBtn.addEventListener("click", () => { openProcessReportedOrderModal(order); });
        }
        const contactDriverBtn = document.getElementById("contactDriverBtn");
        if (contactDriverBtn) {
          contactDriverBtn.addEventListener("click", () => { contactDriver(order.driverPhone || "+9647855874757"); });
        }
      } else {
        if (currentUser.type === "driver") {
          const acceptOrderBtn = document.getElementById("acceptOrderBtn");
          if (acceptOrderBtn) {
            acceptOrderBtn.addEventListener("click", () => {
              const estimatedTime = new Date(Date.now() + 30 * 60000);
              const hours = estimatedTime.getHours();
              const minutes = estimatedTime.getMinutes();
              const formattedTime =
                (hours < 10 ? "0" + hours : hours) +
                ":" +
                (minutes < 10 ? "0" + minutes : minutes);
              let customerPhone = order.phone || "";
              if (customerPhone.startsWith("0")) {
                customerPhone = "+964" + customerPhone.substring(1);
              }
              const messageText = `مرحبا معكم شركة جايك للتوصيل السريع\n` +
                                  `لديكم طلب توصيل\n` +
                                  `نعتذر عن الازعاج، هذه الرسالة تلقائية`;
              firebase.firestore().collection("orders").doc(order.id).update({ status: "قيد التوصيل" })
                .then(() => {
                  storeNotificationCloud(
                    "تحديث حالة الطلب",
                    "تم استلام الطلب وأصبح قيد التوصيل",
                    { type: "statusUpdate", orderId: order.id },
                    "merchant",
                    order.merchantId
                  );
                  const whatsappURL = `intent://send?phone=${customerPhone}&text=${encodeURIComponent(messageText)}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end;`;
                  window.location.href = whatsappURL;
                })
                .catch(() => {
                  Swal.fire("خطأ", "حدث خطأ أثناء تحديث حالة الطلب", "error");
                });
            });
          }
          const reportOrderBtn = document.getElementById("reportOrderBtn");
          if (reportOrderBtn) {
            reportOrderBtn.addEventListener("click", () => { openReportModal(order); });
          }
          const deliveredBtn = document.getElementById("deliveredBtn");
          if (deliveredBtn) {
            deliveredBtn.addEventListener("click", () => {
              Swal.fire({
                title: "تم التوصيل",
                html: `<textarea id="deliveredNotes" class="swal2-textarea" placeholder="أدخل ملاحظات إن وجدت"></textarea>`,
                showCancelButton: true,
                confirmButtonText: "إرسال"
              }).then((result) => {
                if (result.isConfirmed) {
                  const notes = document.getElementById("deliveredNotes").value;
                  firebase.firestore().collection("orders").doc(order.id).update({
                    status: "مكتملة",
                    deliveredNotes: notes
                  }).then(() => {
                    storeNotificationCloud(
                      "أشعار السعادة 😁",
                      `تم تسليم الطلب الى الزبون (رقم ${order.orderNumber || order.id})`,
                      { type: "happiness", orderId: order.id },
                      "merchant",
                      order.merchantId
                    );
                    Swal.fire("تم", "تم تحديث حالة الطلب", "success");
                    loadOrdersForDriver();
                  })
                  .catch(() => { Swal.fire("خطأ", "حدث خطأ أثناء تحديث حالة الطلب", "error"); });
                }
              });
            });
          }
          const contactMerchantBtn = document.getElementById("contactMerchantBtn");
          if (contactMerchantBtn) {
            contactMerchantBtn.addEventListener("click", () => { contactMerchant(order.merchantPhone); });
          }
        }
      }
    }, 200);
  }
  window.renderOrderDetailsModal = renderOrderDetailsModal;

/******************************************************************
 * تعديل تفاصيل الطلب + معالجة الطلب المبلّغ باستخدام Floating Label
 ******************************************************************/

// دالة فتح نافذة تعديل الطلب
function openEditOrderModal(order) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  let editModalHTML = "";
  if (currentUser.type === "merchant") {
    editModalHTML = `
      <div class="modal-overlay" id="editOrderModal">
        <div class="modal-content">
          <h2>تعديل تفاصيل الطلب</h2>
          <form id="editOrderForm">
            <div class="form-group floating-label-group">
              <input type="text" id="editCustomerName" placeholder=" " value="${order.customerName}" required>
              <label for="editCustomerName">اسم الزبون</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="tel" id="editCustomerPhone" placeholder=" " value="${order.phone || ''}" required>
              <label for="editCustomerPhone">رقم الهاتف</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="text" id="editCustomerAddress" placeholder=" " value="${order.address || ''}" required>
              <label for="editCustomerAddress">العنوان</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="number" id="editItemCount" placeholder=" " value="${order.items}" min="1" required>
              <label for="editItemCount">عدد القطع</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="number" id="editOrderPrice" placeholder=" " value="${order.price}" min="2000" required>
              <label for="editOrderPrice">سعر الطلب</label>
            </div>
            <div class="form-group floating-label-group">
              <textarea id="editOrderNotes" placeholder=" ">${order.notes || ''}</textarea>
              <label for="editOrderNotes">ملاحظات</label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn cancel" onclick="closeEditModal()">إلغاء</button>
              <button type="submit" class="btn submit">حفظ التعديلات</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } else if (currentUser.type === "driver") {
    editModalHTML = `
      <div class="modal-overlay" id="editOrderModal">
        <div class="modal-content">
          <h2>تعديل الطلب</h2>
          <form id="editOrderForm">
            <div class="form-group floating-label-group">
              <input type="text" id="editCustomerName" placeholder=" " value="${order.customerName}" required>
              <label for="editCustomerName">اسم الزبون</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="tel" id="editCustomerPhone" placeholder=" " value="${order.phone || ''}" required>
              <label for="editCustomerPhone">رقم الهاتف</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="text" id="editCustomerAddress" placeholder=" " value="${order.address || ''}" required>
              <label for="editCustomerAddress">العنوان</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="number" id="editItemCount" placeholder=" " value="${order.items}" min="1" required>
              <label for="editItemCount">عدد القطع</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="number" id="editOrderPrice" placeholder=" " value="${order.price}" min="2000" required>
              <label for="editOrderPrice">سعر الطلب</label>
            </div>
            <div class="form-group floating-label-group">
              <textarea id="editOrderNotes" placeholder=" ">${order.notes || ''}</textarea>
              <label for="editOrderNotes">ملاحظات</label>
            </div>
            <div class="form-group floating-label-group">
              <input type="text" id="editOrderStatus" placeholder=" " value="${order.status}" required>
              <label for="editOrderStatus">الحالة</label>
            </div>
            <div class="form-group floating-label-group">
              <textarea id="editReportNotes" placeholder=" ">${order.reportNotes || ''}</textarea>
              <label for="editReportNotes">ملاحظات التبليغ (اختياري)</label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn cancel" onclick="closeEditModal()">إلغاء</button>
              <button type="submit" class="btn submit">حفظ التعديلات</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  document.body.insertAdjacentHTML("beforeend", editModalHTML);
  document.getElementById("editOrderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    handleEditOrderSubmission(order.id);
  });
}

function closeEditModal() {
  const modal = document.getElementById("editOrderModal");
  if (modal) modal.remove();
}
window.closeEditModal = closeEditModal;

// دالة تحديث تفاصيل الطلب بعد التعديل
async function handleEditOrderSubmission(orderId) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  let updatedOrder = {
    customerName: document.getElementById("editCustomerName").value,
    phone: document.getElementById("editCustomerPhone").value,
    address: document.getElementById("editCustomerAddress").value,
    items: document.getElementById("editItemCount").value,
    price: document.getElementById("editOrderPrice").value,
    notes: document.getElementById("editOrderNotes").value || "لا يوجد ملاحظات"
  };
  if (currentUser.type === "driver") {
    updatedOrder.status = document.getElementById("editOrderStatus").value;
    updatedOrder.reportNotes = document.getElementById("editReportNotes").value || "";
  }
  try {
    await firebase.firestore().collection("orders").doc(orderId).update(updatedOrder);
    Swal.fire("تم", "تم تحديث تفاصيل الطلب", "success");
    closeEditModal();
    Swal.close();
    if (currentUser.type === "merchant") {
      loadOrdersForMerchant();
    } else {
      loadOrdersForDriver();
    }
    updateTabCounts();
  } catch {
    Swal.fire("خطأ", "حدث خطأ أثناء تحديث تفاصيل الطلب", "error");
  }
}

// دالة فتح نافذة معالجة الطلب المبلّغ باستخدام Floating Label
function openProcessReportedOrderModal(order) {
  const modalHTML = `
    <div class="modal-overlay" id="processOrderModal">
      <div class="modal-content">
        <h2>معالجة الطلب</h2>
        <form id="processOrderForm">
          <div class="form-group floating-label-group">
            <input type="text" id="processCustomerName" placeholder=" " value="${order.customerName}" required>
            <label for="processCustomerName">اسم الزبون</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="tel" id="processCustomerPhone" placeholder=" " value="${order.phone || ''}" required>
            <label for="processCustomerPhone">رقم الهاتف</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="text" id="processCustomerAddress" placeholder=" " value="${order.address || ''}" required>
            <label for="processCustomerAddress">العنوان</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="number" id="processItemCount" placeholder=" " value="${order.items}" required min="1">
            <label for="processItemCount">عدد القطع</label>
          </div>
          <div class="form-group floating-label-group">
            <input type="number" id="processOrderPrice" placeholder=" " value="${order.price}" required min="2000">
            <label for="processOrderPrice">سعر الطلب</label>
            <div class="error-message" id="processPriceError"></div>
          </div>
          <div class="form-group floating-label-group">
            <textarea id="processOrderNotes" placeholder=" ">${order.notes || ''}</textarea>
            <label for="processOrderNotes">ملاحظات</label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn cancel" onclick="closeProcessOrderModal()">إلغاء</button>
            <button type="submit" class="btn submit">حفظ التعديلات</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  document.getElementById("processOrderPrice").addEventListener("input", function (e) {
    const errorDiv = document.getElementById("processPriceError");
    errorDiv.textContent = e.target.value < 2000 ? "السعر يجب أن يكون 2000 دينار أو أكثر" : "";
  });
  document.getElementById("processOrderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    handleProcessReportedOrderSubmission(order);
  });
}
window.openProcessReportedOrderModal = openProcessReportedOrderModal;

function closeProcessOrderModal() {
  const modal = document.getElementById("processOrderModal");
  if (modal) modal.remove();
}
window.closeProcessOrderModal = closeProcessOrderModal;

// دالة معالجة الطلب المبلّغ بعد تعديل البيانات
async function handleProcessReportedOrderSubmission(order) {
  const updatedOrder = {
    customerName: document.getElementById("processCustomerName").value,
    phone: document.getElementById("processCustomerPhone").value,
    address: document.getElementById("processCustomerAddress").value,
    items: document.getElementById("processItemCount").value,
    price: document.getElementById("processOrderPrice").value,
    notes: document.getElementById("processOrderNotes").value || "لا يوجد ملاحظات",
    status: "قيد التوصيل"
  };
  try {
    await firebase.firestore().collection("orders").doc(order.id).update(updatedOrder);
    storeNotificationCloud(
      "تمت معالجة طلب من قبل التاجر",
      `تمت معالجة الطلب رقم (${order.orderNumber || order.id})`,
      { type: "processed", orderId: order.id },
      "driver"
    );
    Swal.fire("تم", "تم معالجة الطلب بنجاح", "success");
    closeProcessOrderModal();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser.type === "merchant") {
      loadOrdersForMerchant();
    } else {
      loadOrdersForDriver();
    }
    updateTabCounts();
  } catch {
    Swal.fire("خطأ", "حدث خطأ أثناء معالجة الطلب", "error");
  }
}
  /******************************************************************
   *                 حذف الطلب + تبليغ الطلب
   ******************************************************************/
  function deleteOrder(orderId) {
    Swal.fire({
      title: 'حذف الطلب',
      text: 'هل أنت متأكد من حذف هذا الطلب؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذفه',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        firebase.firestore().collection("orders").doc(orderId).delete()
          .then(() => {
            Swal.fire("تم", "تم حذف الطلب بنجاح", "success");
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if (currentUser.type === "merchant") {
              loadOrdersForMerchant();
            } else {
              loadOrdersForDriver();
            }
            updateTabCounts();
          })
          .catch(() => {
            Swal.fire("خطأ", "حدث خطأ أثناء حذف الطلب", "error");
          });
      }
    });
  }
  window.deleteOrder = deleteOrder;

  function openReportModal(order) {
    const modalHTML = `
      <div class="modal-overlay" id="reportModal">
        <div class="modal-content">
          <h2>اختر سبب التبليغ</h2>
          <div class="report-options" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
            <button type="button" class="report-option" data-reason="تغيير سعر" style="padding: 10px 15px; border: none; border-radius: 5px; background: #007BFF; color: #fff; cursor: pointer;">تغيير سعر</button>
            <button type="button" class="report-option" data-reason="لايرد" style="padding: 10px 15px; border: none; border-radius: 5px; background: #28a745; color: #fff; cursor: pointer;">لايرد</button>
            <button type="button" class="report-option" data-reason="لايرد بعد الاتفاق" style="padding: 10px 15px; border: none; border-radius: 5px; background: #ffc107; color: #fff; cursor: pointer;">لايرد بعد الاتفاق</button>
            <button type="button" class="report-option" data-reason="مغلق" style="padding: 10px 15px; border: none; border-radius: 5px; background: #dc3545; color: #fff; cursor: pointer;">مغلق</button>
            <button type="button" class="report-option" data-reason="مغلق بعد الاتفاق" style="padding: 10px 15px; border: none; border-radius: 5px; background: #6c757d; color: #fff; cursor: pointer;">مغلق بعد الاتفاق</button>
            <button type="button" class="report-option" data-reason="غير داخل في الخدمة" style="padding: 10px 15px; border: none; border-radius: 5px; background: #17a2b8; color: #fff; cursor: pointer;">غير داخل في الخدمة</button>
            <button type="button" class="report-option" data-reason="لايمكن الاتصال به" style="padding: 10px 15px; border: none; border-radius: 5px; background: #343a40; color: #fff; cursor: pointer;">لايمكن الاتصال به</button>
            <button type="button" class="report-option" data-reason="الغاء الطلب" style="padding: 10px 15px; border: none; border-radius: 5px; background: #007bff; color: #fff; cursor: pointer;">الغاء الطلب</button>
            <button type="button" class="report-option" data-reason="رفض الطلب" style="padding: 10px 15px; border: none; border-radius: 5px; background: #28a745; color: #fff; cursor: pointer;">رفض الطلب</button>
          </div>
          <textarea id="reportNotes" placeholder="أدخل ملاحظات إضافية (اختياري)" style="width: 100%; margin-top: 15px; padding: 10px; border-radius: 5px; border: 1px solid #ccc;"></textarea>
          <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: space-around;">
            <button type="button" onclick="closeReportModal()" style="padding: 10px 20px; background: #6c757d; color: #fff; border: none; border-radius: 5px; cursor: pointer;">إلغاء</button>
            <button type="button" onclick="submitReport('${order.id}', ${order.orderNumber || 0}, '${order.merchantId}')" style="padding: 10px 20px; background: #17a2b8; color: #fff; border: none; border-radius: 5px; cursor: pointer;">إرسال</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    const optionButtons = document.querySelectorAll("#reportModal .report-option");
    optionButtons.forEach(button => {
      button.addEventListener("click", () => {
        optionButtons.forEach(btn => {
          btn.classList.remove("selected");
          btn.style.outline = "none";
        });
        button.classList.add("selected");
        button.style.outline = "3px solid #ffc107";
      });
    });
  }
  window.openReportModal = openReportModal;

  function closeReportModal() {
    const modal = document.getElementById("reportModal");
    if(modal) modal.remove();
  }
  window.closeReportModal = closeReportModal;

  async function submitReport(orderId, orderNumber, merchantId) {
    const selectedButton = document.querySelector("#reportModal .report-option.selected");
    if (!selectedButton) {
      Swal.fire("تنبيه", "يرجى اختيار سبب التبليغ", "warning");
      return;
    }
    const reason = selectedButton.dataset.reason;
    const notes = document.getElementById("reportNotes").value;
    try {
      await firebase.firestore().collection("orders").doc(orderId).update({
        status: "مبلغة",
        reportReason: reason,
        reportNotes: notes
      });
      storeNotificationCloud(
        `تم التبليغ بالطلب رقم ${orderNumber}`,
        `نوع التبليغ: ${reason}. ملاحظات: ${notes || "لا توجد ملاحظات"}`,
        { type: "reported", orderId: orderId },
        "merchant",
        merchantId
      );
      Swal.fire("تم", "تم تحديث حالة الطلب", "success");
      closeReportModal();
      loadOrdersForDriver();
    } catch {
      Swal.fire("خطأ", "حدث خطأ أثناء تحديث حالة الطلب", "error");
    }
  }
  window.submitReport = submitReport;

  /******************************************************************
   *           نظام الإشعارات السحابية (Firestore + Firebase Messaging)
   ******************************************************************/
  function showNotification(title, body) {
    Swal.fire({
      title: title,
      text: body,
      toast: true,
      position: "top-end",
      timer: 5000,
      showConfirmButton: false
    });
  }

  function storeNotificationCloud(title, body, data = {}, recipientType, recipientId) {
    data.recipientType = recipientType;
    if (recipientId) {
      data.recipientId = recipientId;
    }
    const notification = {
      title: title,
      body: body,
      data: data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    firebase.firestore().collection("notifications").add(notification)
      .then(() => console.log("تم حفظ الإشعار في السحابة"))
      .catch(err => console.error("خطأ أثناء حفظ الإشعار:", err));
  }

  if (firebase.messaging && firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();
    messaging.requestPermission()
      .then(() => messaging.getToken())
      .then(token => {
        console.log("FCM Token:", token);
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (currentUser) {
          if (currentUser.type === "merchant") {
            firebase.firestore().collection("merchants").doc(currentUser.uid).update({ deviceToken: token });
          } else if (currentUser.type === "driver") {
            firebase.firestore().collection("drivers").doc(currentUser.uid).update({ deviceToken: token });
          }
        }
      })
      .catch(err => {
        console.error("لم يتم الحصول على إذن الإشعارات:", err);
      });

    messaging.onMessage(payload => {
      console.log("رسالة واردة:", payload);
      if (payload && payload.notification) {
        showNotification(payload.notification.title, payload.notification.body);
        storeNotificationCloud(payload.notification.title, payload.notification.body, { type: "fcm" }, "merchant");
      }
    });
  } else {
    console.warn("Firebase Messaging غير مدعوم في هذا المتصفح.");
  }

  function openNotifications() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    let query = firebase.firestore().collection("notifications").orderBy("createdAt", "desc");
    if (currentUser.type === "merchant") {
      query = query.where("data.recipientId", "==", currentUser.uid);
    } else if (currentUser.type === "driver") {
      query = query.where("data.recipientType", "==", "driver");
    }
    query.get().then(snapshot => {
      if (snapshot.empty) {
        Swal.fire("الإشعارات", "لا توجد إشعارات جديدة", "info");
      } else {
        let notificationsHtml = "<ul style='text-align: right; direction: rtl; list-style: none; padding: 0;'>";
        snapshot.forEach(doc => {
          const notif = doc.data();
          notificationsHtml += `
            <li style="margin-bottom: 10px; cursor: pointer;" onclick="handleNotificationClick('${doc.id}')">
              <strong>${notif.title}</strong><br>${notif.body}
            </li>
          `;
        });
        notificationsHtml += "</ul>";
        Swal.fire({
          title: "الإشعارات",
          html: notificationsHtml,
          width: "400px",
          showConfirmButton: false,
          showCloseButton: true
        });
      }
    })
    .catch(err => {
      console.error("Error fetching notifications:", err);
      Swal.fire("خطأ", "حدث خطأ أثناء جلب الإشعارات", "error");
    });
  }
  window.openNotifications = openNotifications;

  window.handleNotificationClick = function(docId) {
    firebase.firestore().collection("notifications").doc(docId).get()
      .then(doc => {
        if (!doc.exists) return;
        const notif = doc.data();
        if (notif.data && notif.data.type === "newOrder") {
          selectTabByStatus("فعال");
        } else if (notif.data && notif.data.type === "happiness") {
          selectTabByStatus("مكتملة");
        } else if (notif.data && (notif.data.type === "reported" || notif.data.type === "processed" || notif.data.type === "statusUpdate")) {
          if (notif.data.orderId) {
            openOrderDetailsModal(notif.data.orderId);
          }
        }
      })
      .catch(err => {
        console.error("Error handling notification click:", err);
      });
  };

  function selectTabByStatus(status) {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(t => {
      if (t.dataset.status === status) {
        t.click();
      }
    });
  }

  /******************************************************************
   *   إدارة الحسابات المسجلة (حسابات التجار والمندوبين)
   ******************************************************************/
  function openActiveAccounts() {
    Swal.fire({
      title: "الحسابات المسجلة",
      html: `<div style="display:flex; justify-content: center; gap: 10px;">
              <button id="activeDriversBtn" style="background-color: blue; color: white; border: none; padding: 10px 20px; cursor: pointer;">المندوبين</button>
              <button id="activeMerchantsBtn" style="background-color: red; color: white; border: none; padding: 10px 20px; cursor: pointer;">التجار</button>
             </div>`,
      showConfirmButton: false,
      allowOutsideClick: false
    });
    
    setTimeout(() => {
      document.getElementById("activeDriversBtn").addEventListener("click", () => {
        Swal.close();
        showAccountsList("drivers");
      });
      document.getElementById("activeMerchantsBtn").addEventListener("click", () => {
        Swal.close();
        showAccountsList("merchants");
      });
    }, 300);
  }
  window.openActiveAccounts = openActiveAccounts;

  function showAccountsList(collection) {
    firebase.firestore().collection(collection).get()
      .then(snapshot => {
        if (snapshot.empty) {
          Swal.fire("تنبيه", "لا توجد حسابات في هذه الفئة", "info");
          return;
        }
        let listHtml = "<div style='max-height:300px; overflow-y:auto; text-align:right; direction:rtl;'>";
        snapshot.forEach(doc => {
          const data = doc.data();
          const displayName = (collection === "merchants") ? data.storeName : data.name;
          listHtml += `<div class="account-item" data-id="${doc.id}" style="padding:5px; border-bottom:1px solid #ccc; cursor:pointer;">
                          <strong>${displayName || "بدون اسم"}</strong> - ${data.phone || "لا يوجد رقم"}
                       </div>`;
        });
        listHtml += "</div>";
        
        Swal.fire({
          title: "الحسابات المسجلة",
          html: listHtml,
          showConfirmButton: false,
          didOpen: () => {
            const accountItems = document.querySelectorAll(".account-item");
            accountItems.forEach(item => {
              item.addEventListener("click", () => {
                const docId = item.getAttribute("data-id");
                Swal.close();
                showAccountDetails(collection, docId);
              });
            });
          }
        });
      })
      .catch(error => {
        console.error("Error fetching accounts: ", error);
        Swal.fire("خطأ", "حدث خطأ أثناء جلب الحسابات", "error");
      });
  }
  window.showAccountsList = showAccountsList;

  function showAccountDetails(collection, docId) {
    firebase.firestore().collection(collection).doc(docId).get()
      .then(doc => {
        if (!doc.exists) {
          Swal.fire("خطأ", "الحساب غير موجود", "error");
          return;
        }

        const data = doc.data();
        const accountNameField = (collection === "merchants") ? "storeName" : "name";
        const accountName = data[accountNameField] || "";
        const phone = data.phone || "";
        const email = data.email || "";
        const deliveryAddress = data.deliveryAddress || "";

        const htmlContent = `
          <input id="accountNumber" class="swal2-input" placeholder="رقم الحساب" value="${doc.id}" disabled>
          <input id="accountName" class="swal2-input" placeholder="الاسم" value="${accountName}">
          <input id="accountPhone" class="swal2-input" placeholder="رقم الهاتف" value="${phone}">
          <input id="accountEmail" class="swal2-input" placeholder="البريد الإلكتروني" value="${email}" disabled>
          <input id="deliveryAddress" class="swal2-input" placeholder="عنوان الاستلام" value="${deliveryAddress}">
        `;

        Swal.fire({
          title: "تفاصيل الحساب",
          html: htmlContent,
          showCancelButton: true,
          confirmButtonText: "حفظ التعديلات",
          cancelButtonText: "إلغاء",
          showDenyButton: true,
          denyButtonText: "حذف الحساب",
          preConfirm: () => {
            return {
              name: document.getElementById("accountName").value,
              phone: document.getElementById("accountPhone").value,
              deliveryAddress: document.getElementById("deliveryAddress").value
            };
          }
        }).then(result => {
          if (result.isConfirmed) {
            const updatedData = {};
            updatedData[accountNameField] = result.value.name;
            updatedData.phone = result.value.phone;
            updatedData.deliveryAddress = result.value.deliveryAddress;

            firebase.firestore().collection(collection).doc(docId).update(updatedData)
              .then(() => {
                Swal.fire("تم", "تم تحديث الحساب بنجاح", "success");
              })
              .catch(error => {
                console.error("Error updating account: ", error);
                Swal.fire("خطأ", "حدث خطأ أثناء تحديث الحساب", "error");
              });

          } else if (result.isDenied) {
            Swal.fire({
              title: "هل أنت متأكد؟",
              text: "لن تتمكن من استعادة الحساب بعد الحذف!",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "نعم، احذفه",
              cancelButtonText: "إلغاء"
            }).then(deleteConfirm => {
              if (deleteConfirm.isConfirmed) {
                firebase.firestore().collection(collection).doc(docId).delete()
                  .then(() => {
                    Swal.fire("تم", "تم حذف الحساب بنجاح", "success");
                  })
                  .catch(error => {
                    console.error("Error deleting account: ", error);
                    Swal.fire("خطأ", "حدث خطأ أثناء حذف الحساب", "error");
                  });
              }
            });
          }
        });
      })
      .catch(error => {
        console.error("Error fetching account details: ", error);
        Swal.fire("خطأ", "حدث خطأ أثناء جلب تفاصيل الحساب", "error");
      });
  }

  /******************************************************************
   *           دالة إحصائيات التاجر (متوفرة فقط للتاجر)
   ******************************************************************/
  function openStatistics() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.type !== "merchant") {
      Swal.fire("خطأ", "هذه الميزة متاحة للتاجر فقط!", "error");
      return;
    }

    const ordersRef = firebase.firestore().collection("orders")
                        .where("merchantId", "==", currentUser.uid);

    let stats = {
      total: 0,
      active: 0,
      delivering: 0,
      reported: 0,
      completed: 0
    };

    ordersRef.get().then(snapshot => {
      stats.total = snapshot.size;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === "فعال") {
          stats.active++;
        } else if (data.status === "قيد التوصيل") {
          stats.delivering++;
        } else if (data.status === "مبلغة") {
          stats.reported++;
        } else if (data.status === "مكتملة") {
          stats.completed++;
        }
      });

      const categories = [
        { label: "إجمالي الطلبات", value: stats.total,     color: "#2563EB" },
        { label: "طلبات جديدة",    value: stats.active,     color: "#00008B" },
        { label: "قيد التوصيل",    value: stats.delivering, color: "#87CEEB" },
        { label: "طلبات مبلغة",    value: stats.reported,   color: "#EF4444" },
        { label: "طلبات مكتملة",   value: stats.completed,  color: "#10B981" }
      ];

      const maxValue = stats.total || 1;
      let statsHtml = `<div class="circular-stats-grid">`;
      categories.forEach(cat => {
        const percentage = Math.round((cat.value / maxValue) * 20);
        statsHtml += `
          <div class="circular-stat-card">
            <div class="circular-progress" 
                 style="--percentage: ${percentage}; --fill-color: ${cat.color};">
              <div class="circular-inner">
                <span class="progress-value">${cat.value}</span>
              </div>
            </div>
            <div class="stat-label">${cat.label}</div>
          </div>
        `;
      });
      statsHtml += `</div>`;

      Swal.fire({
        title: "الإحصائيات",
        html: statsHtml,
        showCloseButton: true,
        showConfirmButton: false,
        width: "400px"
      });

    })
    .catch(error => {
      console.error("Error fetching statistics:", error);
      Swal.fire("خطأ", "حدث خطأ أثناء جلب الإحصائيات", "error");
    });
  }
  window.openStatistics = openStatistics;
/******************************************************************
 *           دالة تقارير التاجر 
 ******************************************************************/
/******************************************************************
 *           دالة تقارير التاجر 
 ******************************************************************/
function openReports() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.type !== "merchant") {
    Swal.fire("خطأ", "هذه الميزة متاحة للتاجر فقط!", "error");
    return;
  }

  const merchantId = currentUser.uid;
  const ordersRef = firebase.firestore().collection("orders")
      .where("merchantId", "==", merchantId);

  ordersRef.get()
    .then(snapshot => {
      const reportsByDate = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.statusChangedAt) return;

        let dateStr;
        if (data.statusChangedAt.toDate) {
          // إذا كان الحقل من نوع Timestamp
          dateStr = data.statusChangedAt.toDate().toISOString().split('T')[0];
        } else {
          // إذا كان الحقل نصي
          dateStr = data.statusChangedAt;
        }

        // إذا لم يكن هناك كائن للتاريخ المعين، أنشئ واحداً
        if (!reportsByDate[dateStr]) {
          reportsByDate[dateStr] = {
            orderCount: 0,
            totalOrdersSum: 0,
            cancelledSum: 0,
            cancelledCount: 0,
            completedSum: 0,
            completedCount: 0,
          };
        }

        const price = data.price ? parseFloat(data.price) : 0;
        reportsByDate[dateStr].orderCount++;
        reportsByDate[dateStr].totalOrdersSum += price;
        
        // الطلبات المبلّغة (ملغية)
        if (data.status === "مبلغة") {
          reportsByDate[dateStr].cancelledSum += price;
          reportsByDate[dateStr].cancelledCount++;
        }
        // الطلبات المكتملة
        if (data.status === "مكتملة") {
          reportsByDate[dateStr].completedSum += price;
          reportsByDate[dateStr].completedCount++;
        }
      });

      // كتابة البيانات في تقارير التاجر (Collection: merchants -> reports)
      const batch = firebase.firestore().batch();
      const dates = Object.keys(reportsByDate);

      dates.forEach(date => {
        if (reportsByDate[date].orderCount === 0) return;

        const ref = firebase.firestore()
          .collection("merchants")
          .doc(merchantId)
          .collection("reports")
          .doc(date);

        const { orderCount, totalOrdersSum, cancelledSum, cancelledCount, completedSum, completedCount } = reportsByDate[date];

        batch.set(ref, {
          orderCount,
          totalOrdersSum,
          cancelledSum,
          cancelledCount,
          completedSum,
          completedCount,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      return batch.commit();
    })
    .then(() => {
      // بعد الحفظ، نجلب التقارير من قاعدة البيانات لعرضها
      return firebase.firestore()
        .collection("merchants")
        .doc(merchantId)
        .collection("reports")
        .get();
    })
    .then(reportsSnapshot => {
      const dateDocs = [];
      reportsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.orderCount > 0) {
          dateDocs.push({ date: doc.id, data: data });
        }
      });

      // ترتيب التواريخ تنازلياً
      dateDocs.sort((a, b) => b.date.localeCompare(a.date));

      let reportHTML = "";
      dateDocs.forEach(item => {
        // نضع قيم ابتدائية 0 إذا كانت أي قيمة غير متوفرة لمنع ظهور undefined
        const {
          orderCount = 0,
          totalOrdersSum = 0,
          cancelledSum = 0,
          cancelledCount = 0,
          completedSum = 0,
          completedCount = 0
        } = item.data;

        const date = item.date;
        const companyShare = completedCount * 2000;
        const receivedAmount = completedSum - companyShare;
        // يمكنك تغيير هذا الكلاس حسب الحاجة (settled/not-settled)
        const headerClass = 'accordion-header not-settled';

        reportHTML += `
          <div class="accordion">
            <div class="${headerClass}" data-date="${date}">
              ${date}
              <span style="font-size:0.9rem; margin-left:5px; color:white;">(${orderCount} طلب)</span>
            </div>
            <div class="accordion-body">
              
              <!-- مبلغ الطلبات الكلي -->
              <div class="report-details">
                <span class="label">مبلغ الطلبات الكلي</span>
                <span class="value">${totalOrdersSum} دينار</span>
              </div>
              <!-- الفاصل الأول -->
              <div style="height: 1px; background-color: #ddd; margin: 10px 0;"></div>
              
              <!-- الطلبات المبلغة -->
              <div class="report-details">
                <span class="label">عدد الطلبات المبلغة</span>
                <span class="value" style="color:red;">${cancelledCount} طلب</span>
              </div>
              <div class="report-details">
                <span class="label">مبلغ الطلبات المبلغة</span>
                <span class="value">${cancelledSum} دينار</span>
              </div>
              <!-- الفاصل الثاني -->
              <div style="height: 1px; background-color: #ddd; margin: 10px 0;"></div>
              
              <!-- الطلبات المكتملة -->
              <div class="report-details">
                <span class="label">عدد الطلبات المكتملة</span>
                <span class="value" style="color:green;">${completedCount} طلب</span>
              </div>
              <div class="report-details">
                <span class="label">مبلغ الطلبات المكتملة</span>
                <span class="value">${completedSum} دينار</span>
              </div>
              <!-- الفاصل الثالث -->
              <div style="height: 1px; background-color: #ddd; margin: 10px 0;"></div>
              
              <!-- بقية التفاصيل -->
              <div class="report-details">
                <span class="label">المبلغ المستلم</span>
                <span class="value">${receivedAmount} دينار</span>
              </div>
              <div class="report-details">
                <span class="label">حساب الشركة</span>
                <span class="value">${companyShare} دينار</span>
              </div>

              <!-- حاوية الطلبات التفصيلية لهذا اليوم -->
              <div class="orders-container" id="orders-${date}" style="margin-top:10px;"></div>
            </div>
          </div>
        `;
      });

      Swal.fire({
        title: "تقارير اليوم والشهر",
        html: reportHTML,
        width: "400px",
        showCloseButton: true,
        showConfirmButton: false,
        didOpen: () => {
          const headers = document.querySelectorAll(".accordion-header");
          headers.forEach(header => {
            header.addEventListener("click", () => {
              header.classList.toggle("active");
              const body = header.nextElementSibling;
              body.classList.toggle("open");
              
              // عند الفتح نجلب تفاصيل الطلبات الخاصة باليوم المحدد
              if (body.classList.contains("open")) {
                const date = header.getAttribute("data-date");
                fetchOrdersForDate(merchantId, date);
              }
            });
          });
        }
      });
    })
    .catch(error => {
      console.error("Error fetching reports:", error);
      Swal.fire("خطأ", "حدث خطأ أثناء جلب التقارير", "error");
    });
}

/******************************************************************
 *         دالة لجلب الطلبات لكل يوم وعرضها داخل الأكورديون
 ******************************************************************/
function fetchOrdersForDate(merchantId, dateStr) {
  const startDate = new Date(dateStr + "T00:00:00");
  const endDate = new Date(dateStr + "T23:59:59");
  const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
  const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

  firebase.firestore().collection("orders")
    .where("merchantId", "==", merchantId)
    .where("statusChangedAt", ">=", startTimestamp)
    .where("statusChangedAt", "<=", endTimestamp)
    .get()
    .then(snap => {
      let ordersHTML = "";
      snap.forEach(doc => {
        const data = doc.data();
        ordersHTML += `
          <div class="order-item" style="margin-bottom:5px; padding:5px; border-bottom:1px solid #ccc;">
            <strong>رقم الطلب:</strong> ${doc.id}<br/>
            <strong>الحالة:</strong> ${data.status}<br/>
            <strong>السعر:</strong> ${data.price} دينار
          </div>
        `;
      });

      document.getElementById(`orders-${dateStr}`).innerHTML =
        ordersHTML || "<p>لا توجد طلبات لهذا اليوم.</p>";
    })
    .catch(err => {
      console.error("Error fetching orders for date:", err);
    });
}

window.openReports = openReports;
  /******************************************************************
   *           دالة إحصائيات المندوب (للمندوب فقط)
   ******************************************************************/
  function openDriverStatistics() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.type !== "driver") {
      Swal.fire("خطأ", "هذه الميزة متاحة للمندوب فقط!", "error");
      return;
    }
    
    const ordersRef = firebase.firestore().collection("orders");
    
    let stats = {
      total: 0,
      active: 0,
      delivering: 0,
      reported: 0,
      completed: 0
    };
    
    ordersRef.get().then(snapshot => {
      stats.total = snapshot.size;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === "فعال") {
          stats.active++;
        } else if (data.status === "قيد التوصيل") {
          stats.delivering++;
        } else if (data.status === "مبلغة") {
          stats.reported++;
        } else if (data.status === "مكتملة") {
          stats.completed++;
        }
      });
      
      const categories = [
        { label: "إجمالي الطلبات", value: stats.total,     color: "#2563EB" },
        { label: "طلبات جديدة",    value: stats.active,     color: "#00008B" },
        { label: "قيد التوصيل",    value: stats.delivering, color: "#87CEEB" },
        { label: "طلبات مبلغة",    value: stats.reported,   color: "#EF4444" },
        { label: "طلبات مكتملة",   value: stats.completed,  color: "#10B981" }
      ];
      
      const maxValue = stats.total || 1;
      let statsHtml = `<div class="circular-stats-grid">`;
      categories.forEach(cat => {
        const percentage = Math.round((cat.value / maxValue) * 20);
        statsHtml += `
          <div class="circular-stat-card">
            <div class="circular-progress" 
                 style="--percentage: ${percentage}; --fill-color: ${cat.color};">
              <div class="circular-inner">
                <span class="progress-value">${cat.value}</span>
              </div>
            </div>
            <div class="stat-label">${cat.label}</div>
          </div>
        `;
      });
      statsHtml += `</div>`;
      Swal.fire({
        title: "الإحصائيات",
        html: statsHtml,
        showCloseButton: true,
        showConfirmButton: false,
        width: "400px"
      });
    })
    .catch(error => {
      console.error("Error fetching statistics:", error);
      Swal.fire("خطأ", "حدث خطأ أثناء جلب الإحصائيات", "error");
    });
  }
  window.openDriverStatistics = openDriverStatistics;

  /******************************************************************
   *           إضافة مستمع DOMContentLoaded لإعادة تهيئة التبويبات
   *           وإضافة مستمع لزر الإشعارات (notificationsBtn) بحيث عند النقر يتم إغلاق القائمة الجانبية وعرض نافذة الإشعارات
   ******************************************************************/
  document.addEventListener("DOMContentLoaded", function(){
    // إعادة تهيئة التبويبات عند تحميل الصفحة
    setupTabs();
    // التأكد من وجود زر الإشعارات في القائمة الجانبية وإضافة مستمع الحدث له
    const notificationsBtn = document.getElementById("notificationsBtn");
    if(notificationsBtn){
       notificationsBtn.addEventListener("click", function(){
          closeSidebar();
          openNotifications();
       });
    }
  });
})();
document.addEventListener("DOMContentLoaded", function() {
    // التأكد من وجود زر الإشعارات وإضافة مستمع الحدث له
    const notificationsBtn = document.getElementById("notificationsBtn");
    if (notificationsBtn) {
        notificationsBtn.addEventListener("click", function() {
            closeSidebar();
            setTimeout(openNotifications, 300); // تأخير فتح نافذة الإشعارات لمدة 300 مللي ثانية
        });
    }
});
setInterval(loadMerchantStats, 10000); // تحديث كل 10 ثانية
setInterval(loadDriverStats, 10000); // تحديث كل 10 ثانية

function loadMerchantStats() {
  try {
    // كود جلب بيانات التاجر
  } catch (err) {
    console.error("خطأ في جلب إحصائيات التاجر:", err);
  }
  }
