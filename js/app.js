angular
    .module("outfitologyApp", ["ngRoute"])
    .config([
        "$routeProvider",
        "$locationProvider",
        function ($routeProvider, $locationProvider) {
            $locationProvider.hashPrefix("!");

            $routeProvider
                .when("/", {
                    templateUrl: "views/homepage.html",
                    controller: "HomeController",
                    controllerAs: "home",
                })
                .when("/login", {
                    templateUrl: "views/login.html",
                    controller: "LoginController",
                    controllerAs: "login",
                })
                .when("/register", {
                    templateUrl: "views/register.html",
                    controller: "RegisterController",
                    controllerAs: "register",
                })
                .when("/profile", {
                    templateUrl: "views/profile.html",
                    controller: "ProfileController",
                    controllerAs: "profile",
                    resolve: {
                        auth: [
                            "$location",
                            "AuthService",
                            function ($location, AuthService) {
                                return AuthService.checkAuth().catch(function () {
                                    $location.path("/login");
                                });
                            },
                        ],
                    },
                })
                .when("/explore", {
                    templateUrl: "views/explore.html",
                    controller: "ExplorerController",
                    controllerAs: "explore",
                })
                .otherwise({
                    redirectTo: "/",
                });
        },
    ])
    .run([
        "$rootScope",
        "$location",
        "AuthService",
        "UnsplashService",
        "$timeout",
        function ($rootScope, $location, AuthService, UnsplashService, $timeout) {
            // Initialize search-related properties
            $rootScope.searchQuery = "";
            $rootScope.currentPath = "";

            $rootScope.isMenuActive = false;

            // Fungsi toggle menu
            $rootScope.toggleMenu = function () {
                $rootScope.isMenuActive = !$rootScope.isMenuActive;
            };

            // Search handling function
            var searchTimeout;
            $rootScope.handleSearch = function () {
                if ($rootScope.currentPath !== "/explore") return;

                if (searchTimeout) {
                    $timeout.cancel(searchTimeout);
                }

                searchTimeout = $timeout(function () {
                    $rootScope.$broadcast("searchUpdated", $rootScope.searchQuery);
                }, 1000);
            };

            // Clear search function
            $rootScope.clearSearch = function () {
                if ($rootScope.currentPath !== "/explore") return;

                $rootScope.searchQuery = "";
                $rootScope.$broadcast("searchUpdated", "");
            };

            // Handle route change events
            $rootScope.$on("$routeChangeStart", function (event, next, current) {
                $rootScope.isLoading = true;
                $rootScope.isLoggedIn = AuthService.isLoggedIn();
            });

            $rootScope.$on("$routeChangeSuccess", function () {
                $rootScope.isLoading = false;
                window.scrollTo(0, 0);

                $rootScope.isMenuActive = false;

                // Update current path for search visibility
                $rootScope.currentPath = $location.path();

                // Dynamic CSS handling
                var viewStyleMap = {
                    "/": "style/style.css",
                    "/login": "style/loginstyle.css",
                    "/register": "style/registerstyle.css",
                    "/profile": "style/profilestyle.css",
                    "/explore": "style/explorerstyle.css",
                };

                var stylePath = viewStyleMap[$location.path()] || "views/style.css";
                document.getElementById("dynamic-style").setAttribute("href", stylePath);
            });

            $rootScope.$on("$routeChangeError", function () {
                $rootScope.isLoading = false;
                $location.path("/");
            });

            // Cleanup on root scope destroy
            $rootScope.$on("$destroy", function () {
                if (searchTimeout) {
                    $timeout.cancel(searchTimeout);
                }
            });
        },
    ]);
