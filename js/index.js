const API_URL = window.env.API_URL;
// Services

// Auth
angular.module("outfitologyApp").factory("AuthService", [
    "$http",
    "$q",
    function ($http, $q) {
        return {
            login: function (username, password) {
                return $http.post(`${API_URL}/login`, {
                    username: username,
                    password: password,
                });
            },

            register: function (username, email, password) {
                return $http.post(`${API_URL}/register`, {
                    username: username,
                    email: email,
                    password: password,
                });
            },

            isLoggedIn: function () {
                return !!localStorage.getItem("user");
            },

            checkAuth: function () {
                var deferred = $q.defer();

                if (this.isLoggedIn()) {
                    deferred.resolve();
                } else {
                    deferred.reject();
                }

                return deferred.promise;
            },
        };
    },
]);

angular.module("outfitologyApp").factory("UnsplashService", [
    "$http",
    function ($http) {
        return {
            fetchImages: function (userQuery) {
                return $http({
                    method: "GET",
                    url: `${API_URL}/api/unsplash`,
                    params: { query: `${userQuery}, fashion` || "fashion, streetwear, outfit, casual outfit" },
                });
            },
        };
    },
]);

// Controllers
angular
    .module("outfitologyApp")
    .controller("HomeController", [
        "$scope",
        "$interval",
        "$http",
        "AuthService",
        function ($scope, $interval, $http, AuthService) {
            var vm = this;

            // Initialize variables
            vm.currentSlide = 0;
            vm.modalOpen = false;
            vm.selectedOutfit = null;
            vm.userOutfits = [];

            // Slider images
            vm.slides = [
                {
                    url: "https://plus.unsplash.com/premium_photo-1708633003273-bed7672ddd81?q=80&w=1821&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                },
                {
                    url: "https://plus.unsplash.com/premium_photo-1683817138481-dcdf64a40859?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                },
                {
                    url: "https://plus.unsplash.com/premium_photo-1708110920881-635419c3411f?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                },
            ];

            vm.fetchOutfits = function () {
                $http
                    .get(`${API_URL}/outfits`)
                    .then(function (response) {
                        vm.userOutfits = response.data.map(function (outfit) {
                            return {
                                _id: outfit._id,
                                url: outfit.image,
                                outfitName: outfit.name,
                                description: outfit.description,
                                username: outfit.user.username,
                                comments: [],
                                newComment: "",
                                likeCount: 0, // Ini di-reset ke 0
                                liked: false, // Ini di-reset ke false
                            };
                        });

                        vm.userOutfits.forEach(function (outfit) {
                            vm.fetchLikes(outfit);
                        });
                    })
                    .catch(function (error) {
                        console.error("Error fetching outfits:", error);
                    });
            };

            // Call fetchOutfits when controller initializes
            vm.fetchOutfits();

            // Open modal
            vm.openImage = function (outfit) {
                vm.selectedOutfit = outfit;
                vm.modalOpen = true;
                document.body.classList.add("modal-open");
                if (outfit._id) {
                    vm.fetchComments(outfit);
                }
            };

            // Close modal
            vm.closeModal = function () {
                vm.modalOpen = false;
                vm.selectedOutfit = null;
                document.body.classList.remove("modal-open");
            };

            // Toggle like for a specific outfit
            vm.toggleLike = function (outfit) {
                outfit.liked = !outfit.liked; // Toggle the liked status
                outfit.likeCount += outfit.liked ? 1 : -1; // Update the like count
            };

            vm.fetchComments = function (outfit) {
                if (!outfit || !outfit._id) {
                    console.error("No outfit ID available");
                    return;
                }

                $http
                    .get(`${API_URL}/comments/${outfit._id}`)
                    .then(function (response) {
                        outfit.comments = response.data;
                    })
                    .catch(function (error) {
                        console.error("Error fetching comments:", error);
                    });
            };

            vm.addComment = function (outfit) {
                if (!AuthService.isLoggedIn()) {
                    swal("Hold On!", "You need to login to comment", "error");
                    return;
                }

                if (!outfit.newComment || outfit.newComment.trim() === "") {
                    return;
                }

                const userData = JSON.parse(localStorage.getItem("user"));

                if (!userData || !userData._id) {
                    swal("Error!", "User session not found", "error");
                    return;
                }

                const commentData = {
                    outfitId: outfit._id,
                    userId: userData._id,
                    text: outfit.newComment.trim(),
                };

                $http
                    .post(`${API_URL}/comments`, commentData)
                    .then(function (response) {
                        outfit.comments.unshift(response.data.comment);
                        outfit.newComment = "";
                    })
                    .catch(function (error) {
                        console.error("Error adding comment:", error);
                        swal("Error!", "Failed to add comment", "error");
                    });
            };

            vm.updateComment = function (outfit, comment) {
                const userData = JSON.parse(localStorage.getItem("user"));
                if (comment.userId._id !== userData._id) {
                    swal("Error!", "You can only edit your own comments", "error");
                    return;
                }

                const newText = prompt("Edit your comment:", comment.text);
                if (newText === null || newText.trim() === "") return;

                $http
                    .put(`${API_URL}/comments/${comment._id}`, {
                        text: newText,
                    })
                    .then(function (response) {
                        const index = outfit.comments.findIndex((c) => c._id === comment._id);
                        if (index !== -1) {
                            outfit.comments[index] = response.data.comment;
                        }
                    })
                    .catch(function (error) {
                        swal("Error!", "Failed to update comment", "error");
                    });
            };

            vm.deleteComment = function (outfit, comment) {
                const userData = JSON.parse(localStorage.getItem("user"));
                if (comment.userId._id !== userData._id) {
                    swal("Error!", "You can only delete your own comments", "error");
                    return;
                }

                swal({
                    title: "Are you sure?",
                    text: "Once deleted, you will not be able to recover this comment!",
                    icon: "warning",
                    buttons: true,
                    dangerMode: true,
                }).then((willDelete) => {
                    if (willDelete) {
                        $http
                            .delete(`${API_URL}/comments/${comment._id}`)
                            .then(function () {
                                const index = outfit.comments.findIndex((c) => c._id === comment._id);
                                if (index !== -1) {
                                    outfit.comments.splice(index, 1);
                                }
                            })
                            .catch(function (error) {
                                swal("Error!", "Failed to delete comment", "error");
                            });
                    }
                });
            };

            // fetch likes
            vm.fetchLikes = function (outfit) {
                if (!outfit._id) return;

                const userData = JSON.parse(localStorage.getItem("user")); // Ambil data user dari localStorage
                const userId = userData ? userData._id : null; // Ambil userId jika user login

                $http
                    .get(`${API_URL}/outfits/${outfit._id}/likes`, {
                        params: { userId: userId }, // Kirim userId sebagai parameter jika ada
                    })
                    .then(function (response) {
                        outfit.likeCount = response.data.likeCount;
                        outfit.liked = response.data.liked || false;
                    })
                    .catch(function (error) {
                        console.error("Error fetching likes:", error);
                    });
            };

            // Update the toggleLike function
            vm.toggleLike = function (outfit) {
                if (!AuthService.isLoggedIn()) {
                    swal("Hold On!", "You need to login to like outfits", "error");
                    return;
                }

                const userData = JSON.parse(localStorage.getItem("user"));

                $http
                    .post(`${API_URL}/outfits/${outfit._id}/like`, {
                        userId: userData._id,
                    })
                    .then(function (response) {
                        outfit.liked = response.data.liked;
                        outfit.likeCount = response.data.likeCount;
                    })
                    .catch(function (error) {
                        console.error("Error toggling like:", error);
                        swal("Error!", "Failed to update like", "error");
                    });
            };

            // Functions for slider navigation
            vm.nextSlide = function () {
                vm.currentSlide = (vm.currentSlide + 1) % vm.slides.length;
            };

            vm.prevSlide = function () {
                vm.currentSlide = (vm.currentSlide - 1 + vm.slides.length) % vm.slides.length;
            };

            vm.setCurrentSlide = function (index) {
                vm.currentSlide = index;
            };

            vm.isActive = function (index) {
                return vm.currentSlide === index;
            };

            // Auto slide interval (5 seconds)
            var autoSlide = $interval(vm.nextSlide, 5000);

            // Cleanup interval on scope destroy
            $scope.$on("$destroy", function () {
                if (autoSlide) {
                    $interval.cancel(autoSlide);
                }
            });
        },
    ])

    // Login Controller
    .controller("LoginController", [
        "$scope",
        "AuthService",
        "$location",
        function ($scope, AuthService, $location) {
            var vm = this;

            vm.user = {
                username: "",
                password: "",
            };

            function storeUserSession(userData) {
                localStorage.setItem("user", JSON.stringify(userData));
            }

            function checkSessionExpiration() {
                const userData = JSON.parse(localStorage.getItem("user"));
                if (userData && userData.loginTime) {
                    const loginTime = new Date(userData.loginTime);
                    const currentTime = new Date();
                    const timeDifference = currentTime - loginTime; // Selisih waktu dalam milidetik

                    // Jika lebih dari 1 hari (24 jam)
                    if (timeDifference > 24 * 60 * 60 * 1000) {
                        localStorage.removeItem("user"); // Hapus session
                        swal("Session Expired", "Your session has expired. Please login again.", "warning").then(() => {
                            window.location.href = "/login"; // Redirect ke halaman login
                        });
                    }
                }
            }

            vm.submitForm = function () {
                if (vm.user.username && vm.user.password) {
                    AuthService.login(vm.user.username, vm.user.password)
                        .then(function (response) {
                            const userSession = {
                                _id: response.data.user._id,
                                username: response.data.user.username,
                                email: response.data.user.email,
                                loginTime: new Date().toISOString(),
                            };

                            storeUserSession(userSession);

                            swal("Success!", "Login successful.", "success").then(function () {
                                $location.path("/");
                                $scope.$apply();
                            });
                        })
                        .catch(function (error) {
                            console.error("Login error:", error); // Debugging
                            swal("Oops!", "Wrong username or password.", "error");
                        });
                } else {
                    swal("Oops!", "Please fill in both fields.", "error");
                }
            };
        },
    ])

    // Register Controller
    .controller("RegisterController", [
        "$scope",
        "AuthService",
        "$location",
        function ($scope, AuthService, $location) {
            var vm = this;

            vm.user = {
                name: "",
                email: "",
                password: "",
            };

            vm.submitForm = function () {
                AuthService.register(vm.user.name, vm.user.email, vm.user.password)
                    .then(function (response) {
                        swal("Success!", response.data.message, "success").then(function () {
                            $location.path("/login");
                            $scope.$apply();
                        });
                    })
                    .catch(function (error) {
                        swal("Error!", error.data.message || "An unknown error occurred", "error");
                    });
            };
        },
    ])

    // Profile Controller
    .controller("ProfileController", [
        "$location",
        "$http",
        "AuthService",
        function ($location, $http, AuthService) {
            var vm = this;

            vm.activeTab = "created";
            vm.isEditUsernameVisible = false;
            vm.newUsername = "";
            vm.userOutfits = [];
            vm.isPopupVisible = false;
            vm.newOutfit = {
                name: "",
                description: "",
                image: "",
            };

            vm.selectedOutfits = [];
            vm.isEditOutfitVisible = false;
            vm.editingOutfit = {
                _id: null,
                name: "",
                description: "",
                image: "",
            };

            vm.logout = function () {
                localStorage.removeItem("user");

                $location.path("/login");
            };

            vm.openEditUsername = function () {
                if (!AuthService.isLoggedIn()) {
                    swal("Error!", "Please login first", "error");
                    $location.path("/login");
                    return;
                }
                vm.newUsername = vm.user.username;
                vm.isEditUsernameVisible = true;
            };

            vm.closeEditUsername = function (event) {
                if (event && event.target === event.currentTarget) {
                    vm.isEditUsernameVisible = false;
                } else if (!event) {
                    vm.isEditUsernameVisible = false;
                }
            };

            vm.updateUsername = function () {
                if (!vm.newUsername.trim()) {
                    swal("Error!", "Username cannot be empty", "error");
                    return;
                }

                $http
                    .put(`${API_URL}/user/${vm.user._id}`, {
                        username: vm.newUsername,
                    })
                    .then(function (response) {
                        // Update local storage with new username
                        const userData = JSON.parse(localStorage.getItem("user"));
                        userData.username = vm.newUsername;
                        localStorage.setItem("user", JSON.stringify(userData));

                        // Update the user object in the controller
                        vm.user.username = vm.newUsername;

                        swal("Success!", "Username updated successfully", "success");
                        vm.closeEditUsername();
                    })
                    .catch(function (error) {
                        swal("Error!", error.data.message || "Failed to update username", "error");
                    });
            };

            vm.deleteAccount = function () {
                swal({
                    title: "Are you sure?",
                    text: "Once deleted, you will not be able to recover your account and all your created outfits!",
                    icon: "warning",
                    buttons: ["Cancel", "Yes, delete my account"],
                    dangerMode: true,
                }).then((willDelete) => {
                    if (willDelete) {
                        $http
                            .delete(`${API_URL}/user/${vm.user._id}`)
                            .then(function (response) {
                                vm.isEditUsernameVisible = false;
                                localStorage.removeItem("user");
                                $location.path("/login");
                            })
                            .catch(function (error) {
                                swal("Error!", "Failed to delete account", "error");
                            });
                    }
                });
            };

            // Function to fetch user data and outfits
            vm.fetchUserData = function () {
                const currentUsername = JSON.parse(localStorage.getItem("user"))?.username;
                if (!currentUsername) return;

                // Get user data
                $http
                    .get(`${API_URL}/user/${currentUsername}`)
                    .then(function (response) {
                        vm.user = response.data;
                        return $http.get(`${API_URL}/outfits/user/${vm.user._id}`);
                    })
                    .then(function (response) {
                        vm.userOutfits = response.data;
                    })
                    .catch(function (error) {
                        console.error("Error:", error);
                        if (!AuthService.isLoggedIn()) {
                            $location.path("/login");
                        }
                    });
            };

            // Call fetchUserData when controller initializes
            vm.fetchUserData();

            vm.openCreatePopup = function () {
                if (!AuthService.isLoggedIn()) {
                    swal("Error!", "Please login first", "error");
                    $location.path("/login");
                    return;
                }
                vm.isPopupVisible = true;
            };

            vm.closePopup = function (event) {
                if (event && event.target === event.currentTarget) {
                    vm.isPopupVisible = false;
                    vm.newOutfit = { name: "", description: "", image: "" };
                } else if (!event) {
                    vm.isPopupVisible = false;
                    vm.newOutfit = { name: "", description: "", image: "" };
                }
            };

            // Get the file input element
            const fileInput = document.querySelector(".input-file");
            const label = document.querySelector(".js-labelFile");
            const fileName = document.querySelector(".js-fileName");
            const icon = document.querySelector(".icon");
            const originalLabel = fileName.innerHTML;

            // Add event listener for when the file is selected
            fileInput.addEventListener("change", function (e) {
                let fileNameValue = "";

                if (this.files && this.files.length > 0) {
                    fileNameValue = this.files[0].name;
                }

                if (fileNameValue) {
                    fileName.innerHTML = fileNameValue;
                    label.classList.add("has-file");
                    icon.classList.remove("fa-upload");
                    icon.classList.add("fa-check");
                } else {
                    fileName.innerHTML = originalLabel;
                    label.classList.remove("has-file");
                    icon.classList.remove("fa-check");
                    icon.classList.add("fa-upload");
                }
            });

            vm.submitOutfit = function () {
                if (!AuthService.isLoggedIn()) {
                    swal("Error!", "Please login first", "error");
                    $location.path("/login");
                    return;
                }

                const form = document.getElementById("outfitForm");
                form.addEventListener("submit", async (e) => {
                    e.preventDefault();

                    const name = form.name.value.trim();
                    const description = form.description.value.trim();
                    const image = form.image.files[0];

                    // Validasi kosong
                    if (!name || !description || !image) {
                        swal("Oops!", "You need to fill all fields to continue", "warning");
                        return;
                    }

                    // Validasi tipe file
                    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
                    if (!allowedTypes.includes(image.type)) {
                        swal("Oops!", "Image type is not supported", "warning");
                        return;
                    }

                    const maxSize = 10 * 1024 * 1024;
                    if (image.size > maxSize) {
                        swal("Oops!", "Image size exceed 10MB", "warning");
                        return;
                    }

                    const formData = new FormData(form);
                    const userId = vm.user._id;
                    formData.append("userId", userId);

                    try {
                        const response = await fetch(`${API_URL}/outfits`, {
                            method: "POST",
                            body: formData,
                        });

                        const result = await response.json();
                        if (response.ok) {
                            swal("Success!", "Outfit created successfully", "success");
                            vm.closePopup();
                            vm.fetchUserData();
                        } else {
                            console.error("Error creating outfit:", error);
                            swal("Error!", error.data?.message || "Failed to create outfit", "error");
                        }
                    } catch (error) {
                        console.error("Terjadi kesalahan: " + error.message);
                    }
                });
            };

            vm.toggleOutfitSelection = function (outfitId) {
                const index = vm.selectedOutfits.indexOf(outfitId);
                if (index === -1) {
                    vm.selectedOutfits.push(outfitId);
                } else {
                    vm.selectedOutfits.splice(index, 1);
                }
            };

            // Add method to open edit popup
            vm.openEditOutfit = function (outfit) {
                vm.editingOutfit = {
                    _id: outfit._id,
                    name: outfit.name,
                    description: outfit.description,
                };
                vm.isEditOutfitVisible = true;
            };

            // Add method to close edit popup
            vm.closeEditOutfit = function (event) {
                if (event && event.target === event.currentTarget) {
                    vm.isEditOutfitVisible = false;
                    vm.editingOutfit = {
                        _id: null,
                        name: "",
                        description: "",
                    };
                } else if (!event) {
                    vm.isEditOutfitVisible = false;
                    vm.editingOutfit = {
                        _id: null,
                        name: "",
                        description: "",
                    };
                }
            };

            // Add method to submit edited outfit
            vm.submitEditOutfit = function () {
                if (!vm.editingOutfit.name || !vm.editingOutfit.description) {
                    swal("Error!", "Please fill all fields", "error");
                    return;
                }

                $http
                    .put(`${API_URL}/outfits/${vm.editingOutfit._id}`, vm.editingOutfit)
                    .then(function (response) {
                        swal("Success!", "Outfit updated successfully", "success");
                        vm.closeEditOutfit();
                        vm.fetchUserData();
                    })
                    .catch(function (error) {
                        swal("Error!", error.data?.message || "Failed to update outfit", "error");
                    });
            };

            // Add method to delete selected outfits
            vm.deleteSelectedOutfits = function () {
                if (vm.selectedOutfits.length === 0) {
                    swal("Error!", "Please select outfits to delete", "error");
                    return;
                }

                swal({
                    title: "Are you sure?",
                    text: "You are about to delete " + vm.selectedOutfits.length + " outfit(s). This action cannot be undone!",
                    icon: "warning",
                    buttons: ["Cancel", "Yes, delete"],
                    dangerMode: true,
                }).then((willDelete) => {
                    if (willDelete) {
                        $http({
                            method: "DELETE",
                            url: `${API_URL}/outfits`,
                            data: { outfitIds: vm.selectedOutfits },
                            headers: {
                                "Content-Type": "application/json",
                            },
                        })
                            .then(function (response) {
                                swal("Success!", "Successfully deleted your outifts", "success");
                                vm.selectedOutfits = [];
                                vm.fetchUserData();
                            })
                            .catch(function (error) {
                                swal("Error!", error.data?.message || "Failed to delete outfits", "error");
                            });
                    }
                });
            };

            vm.setTab = function (tab) {
                vm.activeTab = tab;
            };

            vm.goBack = function () {
                $location.path("/");
            };
        },
    ])

    // Explorer Controller
    .controller("ExplorerController", [
        "$scope",
        "UnsplashService",
        "$window",
        "$document",
        "$rootScope",
        function ($scope, UnsplashService, $window, $document, $rootScope) {
            var vm = this;
            vm.page = 1;
            vm.fetching = false;
            vm.columns = [[], [], [], [], []];
            vm.isLoading = true;
            vm.isMobileMenuActive = false;
            vm.originalImages = [];

            vm.createCard = function (imageUrl, colIndex) {
                vm.columns[colIndex].push({
                    imageUrl: imageUrl,
                    loaded: false,
                    error: false,
                });
            };

            function getColumnCount() {
                if (window.innerWidth <= 800) {
                    return 2; // 2 kolom untuk layar kecil (mobile)
                } else if (window.innerWidth <= 1024) {
                    return 3; // 3 kolom untuk layar sedang (tablet)
                } else {
                    return 5; // 5 kolom untuk layar besar (desktop)
                }
            }

            vm.fetchImageData = function (searchQuery) {
                if (vm.fetching) return;

                vm.fetching = true;
                vm.isLoading = true;

                UnsplashService.fetchImages(searchQuery)
                    .then(function (response) {
                        if (response.data.length > 0) {
                            vm.originalImages = vm.originalImages.concat(response.data);

                            if (vm.page === 1) {
                                const columnCount = getColumnCount();
                                vm.columns = Array.from({ length: columnCount }, () => []);
                            }

                            response.data.forEach(function (image, index) {
                                const columnCount = getColumnCount();
                                vm.createCard(image.urls.small, index % columnCount);
                            });
                        }
                    })
                    .catch(function (error) {
                        console.error("Error fetching data:", error);
                    })
                    .finally(function () {
                        vm.fetching = false;
                        vm.isLoading = false;
                    });
            };

            // Listen for search updates from rootScope
            $scope.$on("searchUpdated", function (event, searchQuery) {
                vm.page = 1;
                vm.columns = [[], [], [], [], []];
                vm.originalImages = [];
                vm.fetchImageData(searchQuery);
            });

            // Handle infinite scroll
            angular.element($window).on("scroll", function () {
                if (vm.fetching) return;

                var scrollTop = $window.pageYOffset || $document[0].documentElement.scrollTop;
                var windowHeight = $window.innerHeight;
                var bodyHeight = $document[0].documentElement.scrollHeight;

                if (bodyHeight - scrollTop - windowHeight < 800) {
                    vm.page++;
                    $scope.$apply(function () {
                        vm.fetchImageData($rootScope.searchQuery);
                    });
                }
            });

            // Cleanup when controller is destroyed
            $scope.$on("$destroy", function () {
                angular.element($window).off("scroll");
            });

            // Initial load
            vm.fetchImageData("");
        },
    ]);
