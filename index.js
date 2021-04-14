console.log(turf);
class GameScene extends Phaser.Scene {
    constructor() {
        super('game-scene')
        this.player
        this.controls
        this.map
        this.mapObjects

        this.mapCoverageBounds = []

        this.antennas = []
        this.antennaContainerGroup
        this.antennaMaxWidth = 350
        this.antennaMaxHeight = 350
        this.maxAntennas

        this.coverageScore

        this.toggleInterferenceZones
        this.interferenceZoneGroup

        this.playerX
        this.playerY
    }

    preload() {
        this.load.image("tiles", "./assets/tilesets/tuxmon-sample-32px-extruded.png");
        this.load.tilemapTiledJSON("map", "./assets/tilemaps/wifiMap2.json");
        this.load.atlas("atlas", "./assets/atlas/atlas.png", "./assets/atlas/atlas.json");
        this.load.image('star', 'assets/images/star.png');

    }

    create() {
        this.toggleInterferenceZones = true;
        this.map = this.make.tilemap({
            key: "map"
        });

        let mapCoverageBoundsObj = this.map.objects[0].objects.filter(
            obj => obj.name === "mapCoverageBounds"
        )[0]; 
        let relativeMapCoverageBounds = mapCoverageBoundsObj.polygon.map(el => [el.x, el.y]); 
        for (let index = 0; index < relativeMapCoverageBounds.length; index++) {
            let element = relativeMapCoverageBounds[index];
       
            this.mapCoverageBounds.push( [
                element[0] + mapCoverageBoundsObj.x,
                element[1] + mapCoverageBoundsObj.y  
            ])
        }  
        this.mapCoverageBounds.push(this.mapCoverageBounds[0])

        this.mapObjects = this.map.objects[0].objects.filter(
            obj => obj.type == "Interference"
        );


        this.antennaContainerGroup = this.physics.add.group();

        const tileset = this.map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles");

        // Parameters: layer name (or index) from Tiled, tileset, x, y
        const belowLayer = this.map.createLayer("Below Player", tileset, 0, 0);
        const boundsLayer = this.map.createLayer("Bounds", tileset, 0, 0);
        const worldLayer = this.map.createLayer("World", tileset, 0, 0);
        const aboveLayer = this.map.createLayer("Above Player", tileset, 0, 0);

        this.maxAntennas = (this.map.heightInPixels * this.map.widthInPixels) / (this.antennaMaxWidth * this.antennaMaxHeight) + 1;

        this.mapObjects = randomGeneratorTest(this.map, worldLayer, belowLayer, this.mapObjects);

        worldLayer.setCollisionByProperty({
            collides: true
        });


        this.interferenceZoneGroup = this.physics.add.group({
            visible: false
        });
        this.mapObjects.forEach(element => {
            let rect = this.add.rectangle(element.x + element.width / 2, element.y + element.height / 2, element.width, element.height, 0xdd3456, .6).setInteractive();
            rect.visible = this.toggleInterferenceZones;
            rect.depth = 95
            this.interferenceZoneGroup.add(rect);

        }, this);

        // mapCoverageBoundsObj.polygon = mapCoverageBoundsObj.polygon.map(el=>{return {x:mapCoverageBoundsObj.x+ el.x,y:mapCoverageBoundsObj.y+ el.y};})
        // let poly = this.add.polygon(null ,null ,  mapCoverageBoundsObj.polygon , 0xdd3456, .6).setInteractive();
        // poly.visible = this.toggleInterferenceZones;
        // poly.depth = 95
        // this.interferenceZoneGroup.add(poly);

 
        //set click events on objects in worldLayer
        this.input.keyboard.on('keydown-S', () => {
            this.events.emit('toggleMenu');
        })
        this.input.on('pointerup', (pointer) => {
            let phase1menu = this.scene.manager.scenes.filter(a => a.scene.settings.key === 'phase1menu-scene')[0]

            //when we click the game scene in phase 1 
            if (phase1menu.scene.settings.active) {
                let found = false
                let alreadyFound = false

                for (let i = 0; i < this.mapObjects.length; i++) {
                    let element = this.mapObjects[i];

                    if (
                        (element.x < pointer.worldX && element.x + element.width >= pointer.worldX) &&
                        (element.y < pointer.worldY && element.y + element.height >= pointer.worldY)

                    ) {
                        found = true
                        alreadyFound = element.properties.filter(obj => obj.name === "identified")[0].value
                        element.properties.filter(obj => obj.name === "identified")[0].value = true
                      
                    }

                }
                if (found) {
                    if (alreadyFound) {
                       //TODO:add additional Scoring logic
                    } else {
                        
                        this.events.emit('addScore');
                    }
                } else {
                     
                    this.events.emit('subtractScore');
                }
            } else { 
               
            }

        }, this);


        boundsLayer.setCollisionByProperty({
            collides: true
        });

        // By default, everything gets depth sorted on the screen in the order we created things. Here, we
        // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
        // Higher depths will sit on top of lower depth objects.
        aboveLayer.setDepth(10);

        // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
        // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"
        const spawnPoint = this.map.findObject("Objects", obj => obj.name === "Spawn Point");

        // Create a sprite with physics enabled via the physics system. The image used for the sprite has
        // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
        this.player = this.physics.add
            .sprite(spawnPoint.x, spawnPoint.y, "atlas", "misa-front")
            .setSize(30, 40)
            .setOffset(0, 24);
        //39x39 map of 32px tiles
        //TODO: limit player movement to map
        var customBounds = new Phaser.Geom.Rectangle(0, 0, 1248, 1248);
        this.player.body.setBoundsRectangle(customBounds);

        // Watch the player and worldLayer for collisions, for the duration of the scene:
        this.physics.add.collider(this.player, boundsLayer);
        this.physics.add.collider(this.player, worldLayer);
        // Create the player's walking animations from the texture atlas. These are stored in the global
        // animation manager so any sprite can access them.

        this.createPlayerAnmiations(this.anims);

        this.camera = this.cameras.main;
        this.camera.startFollow(this.player);
        this.camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        this.cursors = this.input.keyboard.createCursorKeys();

        // Help text that has a "fixed" position on the screen
        this.add
            .text(16, 16, 'Arrow keys to move\nPress "S" to show stats menu', {
                font: "18px Arial",
                fill: "#000000",
                padding: {
                    x: 20,
                    y: 10
                },
                backgroundColor: "#ffffff"
            })
            .setScrollFactor(0)
            .setDepth(30);

        let ourPhase2Menu = this.scene.manager.scenes[2];

        ourPhase2Menu.events.on('toggleInterferenceZones', function () {
            this.toggleInterferenceZones = !this.toggleInterferenceZones;

            this.interferenceZoneGroup.children.iterate((child) => {
                child.visible = this.toggleInterferenceZones;

            });
        }, this);


        ourPhase2Menu.events.on('deleteAntenna', function () {
            if (this.antennaContainerGroup.children.size > 0) {
                this.antennaContainerGroup.children.entries[this.antennaContainerGroup.children.size - 1].destroy();
                this.antennas.pop();
                this.coverageScore = this.calculateCoverageScore(this.antennas, this.mapCoverageBounds);
                this.events.emit('antennaCount', this.coverageScore, this.antennas.length);  
            }
        }, this);

        ourPhase2Menu.events.on('createAntenna', function () {
            if (this.maxAntennas > this.antennaContainerGroup.children.size) {
                
                //create container
                let antennaContainer = this.add.container(this.playerX, this.playerY);

                //config container 
                antennaContainer.setSize(this.antennaMaxWidth, this.antennaMaxHeight).setDepth(96);
                antennaContainer.setInteractive();
                antennaContainer.customIndex = this.antennas.length; //TODO: set index to prepare to remove a specific antennae

                //create objects to go in container
                let antennaRange = this.add.rectangle(0, 0, this.antennaMaxWidth, this.antennaMaxHeight, 0xFFFFFF, 0.6);

                let newAntenna = this.add.sprite(0, 0, 'star');

                //add to container
                antennaContainer.add(antennaRange);
                antennaContainer.add(newAntenna);

                this.antennas.push(antennaContainer);
                this.antennaContainerGroup.add(antennaContainer);

                //set events on antenna container

                //TODO: add way to decrement score if antennas overlap
                this.physics.add.collider(this.antennaContainerGroup, antennaContainer, () => {
                    this.coverageScore = this.coverageScore *.92;
                    this.events.emit('coverageScore', this.coverageScore);
                }); 

                //give dragged object a different colour
                this.input.setDraggable(antennaContainer);
                this.input.on('dragstart', function (pointer, gameObjectContainer) {
                    gameObjectContainer.list[1].setTint(0xff0000);
                    
                    let touchingInterferenceObject = this.calculateDistanceFromInterferenceObjects(this.mapObjects, gameObjectContainer.x - gameObjectContainer.displayWidth / 2, gameObjectContainer.y - gameObjectContainer.displayHeight / 2, gameObjectContainer.displayWidth, gameObjectContainer.displayHeight, 0, this)

                    if (touchingInterferenceObject) {
                        this.tweens.add({
                            targets: gameObjectContainer,
                            scale: .7,
                            ease: 'Linear',
                            duration: 500,
                        });
                    } else {
                        this.tweens.add({
                            targets: gameObjectContainer,
                            scale: 1,
                            ease: 'Linear',
                            duration: 500,
                        });
                    }

                    this.coverageScore = this.calculateCoverageScore(this.antennas, this.mapCoverageBounds);
                    this.events.emit('coverageScore', this.coverageScore);
                }, this);

                //when dragged, update containers position on map
                this.input.on('drag', function (pointer, gameObjectContainer, dragX, dragY) {
                     
                    gameObjectContainer.x = dragX;
                    gameObjectContainer.y = dragY;
                 
                }, this);

                //when finished dragging calculate new coverage score
                this.input.on('dragend', function (pointer, gameObjectContainer) {
                    gameObjectContainer.list[1].clearTint();
                    let touchingInterferenceObject = this.calculateDistanceFromInterferenceObjects(this.mapObjects, gameObjectContainer.x - gameObjectContainer.displayWidth / 2, gameObjectContainer.y - gameObjectContainer.displayHeight / 2, gameObjectContainer.displayWidth, gameObjectContainer.displayHeight, 0, this)

                    if (touchingInterferenceObject) {
                        this.tweens.add({
                            targets: gameObjectContainer,
                            scale: .7,
                            ease: 'Linear',
                            duration: 500,
                            onComplete: this.refreshCoverageScore.bind(this),
                        });
                    } else {
                        
                        this.tweens.add({
                            targets: gameObjectContainer,
                            scale: 1,
                            ease: 'Linear',
                            duration: 500,
                            onComplete: this.refreshCoverageScore.bind(this), 
                        });
                    }
                    
                }, this);

                let touchingInterferenceObject = this.calculateDistanceFromInterferenceObjects(this.mapObjects, antennaContainer.x - antennaContainer.displayWidth / 2, antennaContainer.y - antennaContainer.displayHeight / 2, antennaContainer.displayWidth, antennaContainer.displayHeight, 0, this)

                if (touchingInterferenceObject) {
                    this.tweens.add({
                        targets: antennaContainer,
                        scale: .7,
                        ease: 'Linear',
                        duration: 500,
                    });
                    
                } else {
                    this.tweens.add({
                        targets: antennaContainer,
                        scale: 1,
                        ease: 'Linear',
                        duration: 500,
                    }); 
                }
                this.coverageScore = this.calculateCoverageScore(this.antennas, this.mapCoverageBounds);
                this.events.emit('antennaCount', this.coverageScore, this.antennas.length);  

            }
        }, this);

        
        ourPhase2Menu.events.on('prepareFinalScreenShot', function () {
            this.interferenceZoneGroup.children.iterate((child) => {
                child.visible = true; 
            });
            console.log(this)
           this.scene.manager.scenes.filter(a => a.scene.key === 'phase2menu-scene')[0].active = true;
          
        }, this);

    }

    refreshCoverageScore(){
        this.coverageScore = this.calculateCoverageScore(this.antennas, this.mapCoverageBounds);
        this.events.emit('coverageScore', this.coverageScore);
    }

    update(time, delta) {
        const speed = 200;
        const prevVelocity = this.player.body.velocity.clone();
        this.playerX = this.player.body.x

        this.playerY = this.player.body.y

        // Stop any previous movement from the last frame
        this.updatePlayerMovement(speed, prevVelocity);
        this.calculateDistanceFromInterferenceObjects(this.mapObjects, this.player.body.x, this.player.body.y, this.player.displayWidth, this.player.displayHeight, 170, this);
    }

    createPlayerAnmiations(anims) {
        anims.create({
            key: "misa-left-walk",
            frames: anims.generateFrameNames("atlas", {
                prefix: "misa-left-walk.",
                start: 0,
                end: 3,
                zeroPad: 3
            }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: "misa-right-walk",
            frames: anims.generateFrameNames("atlas", {
                prefix: "misa-right-walk.",
                start: 0,
                end: 3,
                zeroPad: 3
            }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: "misa-front-walk",
            frames: anims.generateFrameNames("atlas", {
                prefix: "misa-front-walk.",
                start: 0,
                end: 3,
                zeroPad: 3
            }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: "misa-back-walk",
            frames: anims.generateFrameNames("atlas", {
                prefix: "misa-back-walk.",
                start: 0,
                end: 3,
                zeroPad: 3
            }),
            frameRate: 10,
            repeat: -1
        });
    }

    updatePlayerMovement(speed, prevVelocity) {
        this.player.body.setVelocity(0);

        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(speed);
        }

        // Vertical movement
        if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(speed);
        }

        // Normalize and scale the velocity so that player can't move faster along a diagonal
        this.player.body.velocity.normalize().scale(speed);

        // Update the animation last and give left/right animations precedence over up/down animations
        if (this.cursors.left.isDown) {
            this.player.anims.play("misa-left-walk", true);
        } else if (this.cursors.right.isDown) {
            this.player.anims.play("misa-right-walk", true);
        } else if (this.cursors.up.isDown) {
            this.player.anims.play("misa-back-walk", true);
        } else if (this.cursors.down.isDown) {
            this.player.anims.play("misa-front-walk", true);
        } else {
            this.player.anims.stop();

            // If we were moving, pick and idle frame to use
            if (prevVelocity.x < 0)
                this.player.setTexture("atlas", "misa-left");
            else if (prevVelocity.x > 0)
                this.player.setTexture("atlas", "misa-right");
            else if (prevVelocity.y < 0)
                this.player.setTexture("atlas", "misa-back");
            else if (prevVelocity.y > 0)
                this.player.setTexture("atlas", "misa-front");
        }


    }

    calculateDistanceFromInterferenceObjects(mapObjects, objectX, objectY, objectWidth, objectHeight, hitBoxIncrease, game) {

        let close = false;
        let elementX = 0,
            elementY = 0;
        //TODO: loop through all objects and get min distance,
        // log different messages based on distance from object body
        for (let index = 0; index < mapObjects.length; index++) {
            let element = mapObjects[index]; 
            //if our object is close enough (1 object hitbox away) from an interference source
            // **UPDATED increased radius
            if (
                ((element.x - objectWidth) - hitBoxIncrease < objectX && element.x + (element.width + objectWidth) + hitBoxIncrease >= objectX) &&
                ((element.y - objectHeight) - hitBoxIncrease < objectY && element.y + (element.height + objectHeight) + hitBoxIncrease >= objectY)
            ) {
                close = true;
                elementX = element.x;
                elementY = element.y;
              break
            }
        }
        if (close ) {
            // This invokes the event handler grabDistance, which is used to update
            // this.speed variable. Using math.distance between player and interference
            // @Parameters playerX, PlayerY, X, 
            game.events.emit('grabDistance', objectX, objectY, elementX, elementY);
        }

        return close;
    }

    convertXyToLatLn(arr){

        const MapWidth = this.map.widthInPixels;  
        const MapHeight = this.map.heightInPixels;
        const kilometersPerDegree = 111.2;

        const ScaledMapWidth = MapWidth / 10;  
        const ScaledMapHeight = MapHeight / 10;
            
        const GivenLat = 50;
        const GivenLon = 50;

        const GivenLatChange = ScaledMapWidth/kilometersPerDegree;
        const GivenLonChange= Math.abs(Math.cos(ScaledMapHeight/kilometersPerDegree*(Math.PI/180)))*2;
        

        //given an arbitrary starting lat long of 50 50 give me a rough bounding box 128 km(scaled map size) in each direction
        let maxLatIsMinY = GivenLat +GivenLatChange//(0.009 * ScaledMapHeight); 
        let minLatIsMaxY = GivenLat -GivenLatChange//(0.009 * ScaledMapHeight); 
        let minLonIsMinX = GivenLon - GivenLonChange//(0.009 * ScaledMapWidth); 
        let maxLonIsMaxX = GivenLon + GivenLonChange//(0.009 * ScaledMapWidth); 

        const MapLatLon = [//bounding box of the map
            [
                [minLonIsMinX,maxLatIsMinY],//[0,0]
                [maxLonIsMaxX,maxLatIsMinY],// [1280,0]  
                [maxLonIsMaxX,minLatIsMaxY],//[1280,1280]
                [minLonIsMinX,minLatIsMaxY],//[0,1280]
                [minLonIsMinX,maxLatIsMinY],//[0,0]

            ] 
        ];

        let xInLongitude = (maxLonIsMaxX - minLonIsMinX) * (arr[0] / MapWidth )+ minLonIsMinX; 
        let yInLatitude = (minLatIsMaxY - maxLatIsMinY) * (arr[1] / MapHeight )+ maxLatIsMinY;//flipped since longitude decreases going 'downward'
        
        return [xInLongitude, yInLatitude];

    }


    calculateCoverageScore(listOfAntennas, mapCoverageBounds) {
        mapCoverageBounds = mapCoverageBounds.map(arr =>{
            arr = this.convertXyToLatLn(arr); 
            return arr;
        });
        mapCoverageBounds.push(mapCoverageBounds[0]) 
 
        let total = 0;

        let polyA,
            polyAArea,
            polyAPolyBIntersection,
            polyAPolyBIntersectionPolyAIntersection,
            polyAPolyBIntersectionPolyAIntersectionArea;

        polyA = {
            type: 'Feature',
            properties: {
                fill: '#0f0'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [mapCoverageBounds]
            }
        }; 

        for (let index = 0; index < listOfAntennas.length; index++) {
            const element = listOfAntennas[index];
            
            let elementBounds =[//finesse lat and ln calc to get a rough estimate of coverage
                [Math.abs(element.x - (element.scale * element.width/2)), Math.abs(element.y - (element.scale * element.height/2))],
                [Math.abs(element.x + (element.scale * element.width/2)), Math.abs(element.y - (element.scale * element.height/2))],
                [Math.abs(element.x + (element.scale * element.width/2)), Math.abs(element.y + (element.scale * element.height/2))],
                [Math.abs(element.x - (element.scale * element.width/2)), Math.abs(element.y + (element.scale * element.height/2))],
                [Math.abs(element.x - (element.scale * element.width/2)), Math.abs(element.y - (element.scale * element.height/2))],
            ]
            elementBounds = elementBounds.map(arr =>{
                arr = this.convertXyToLatLn(arr); 
                return arr;
            });

            // Using "intersection" result 
            polyAPolyBIntersection = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        elementBounds
                    ]
                }
            } 
            // Calculate intersection between polyAPolyBIntersection and polyA.
            polyAPolyBIntersectionPolyAIntersection = turf.intersect.default(polyAPolyBIntersection, polyA);

            //if there is intersection then calculate how much
            if(polyAPolyBIntersectionPolyAIntersection){ 
                // Calculate area  of polyA and polyAPolyBIntersectionPolyAIntersection.
                polyAArea = turf.area.default(polyA);

                polyAPolyBIntersectionPolyAIntersectionArea = turf.area.default(polyAPolyBIntersectionPolyAIntersection);

                // Calculate how much of polyA is covered.
                total += polyAPolyBIntersectionPolyAIntersectionArea / polyAArea;
            }
        }

        //now loop through each antenna and subtract any overlapping areas 
        // for (let i = 0; i < listOfAntennas.length; i++) {
        //     const currAntenna = listOfAntennas[i];

        //     // Using "intersection" result 
        //     polyAPolyBIntersection = {
        //         type: 'Feature',
        //         properties: {},
        //         geometry: {
        //             type: 'Polygon',
        //             coordinates: [
        //                 [
        //                     [currAntenna.x, currAntenna.y],
        //                     [currAntenna.x + currAntenna.width, currAntenna.y],
        //                     [currAntenna.x, currAntenna.y + currAntenna.height],
        //                     [currAntenna.x + currAntenna.width, currAntenna.y + currAntenna.height]
        //                 ]
        //             ]
        //         }
        //     }

        //     for (let j = 0; j < listOfAntennas.length; j++) {
        //         const otherAntenna = listOfAntennas[j];

        //         // Using "intersection" result 
        //         polyAPolyBIntersection = {
        //             type: 'Feature',
        //             properties: {},
        //             geometry: {
        //                 type: 'Polygon',
        //                 coordinates: [
        //                     [
        //                         [otherAntenna.x, otherAntenna.y],
        //                         [otherAntenna.x + otherAntenna.width, otherAntenna.y],
        //                         [otherAntenna.x, otherAntenna.y + otherAntenna.height],
        //                         [otherAntenna.x + otherAntenna.width, otherAntenna.y + otherAntenna.height]
        //                     ]
        //                 ]
        //             }
        //         }

        //         // Calculate intersection between polyAPolyBIntersection and polyA.
        //         polyAPolyBIntersectionPolyAIntersection = turf.intersect.default(polyAPolyBIntersection, polyA);

        //         // Calculate area  of polyA and polyAPolyBIntersectionPolyAIntersection.
        //         polyAArea = turf.area.default(polyA);
        //         polyAPolyBIntersectionPolyAIntersectionArea = turf.area.default(polyAPolyBIntersectionPolyAIntersection);

        //         // Calculate how much of polyA is covered.
        //         total -= polyAPolyBIntersectionPolyAIntersectionArea / polyAArea * .25; 
        //     }
        // } 

        return total;

    }

}

function randomGeneratorTest(map, world, below, mapObjects) {

    // var maximumInterference = 3;
    let properties = {
        outside: 2,
        indoor: 3
    };

    /*
      Id: 493
      Is the microwave Tile
  
      Id: 661
      Is the radio tile
  
      Id:
    */

    // worldLayer.putTileAt(661, 7, 19);
 
    var height = map.height;
    var width = map.width;
    var objectLen = mapObjects.length;

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            // console.log("posX: " + x + " posY: " + y + " Width: " + (width-2) + " Height: " + (height-2));
            // console.log(below.getTileAt(x,y).index);
            if (y >= (height - 1) && x >= (width - 1) && properties.outdoor > 0 && properties.indoor > 0) {
                y = 0;
                x = 0;
                // console.log("outdoor: " + properties.outdoor + " indoor: " + properties.indoor);
            }
            // console.log(Math.floor(Math.random()*10));
            if (below.getTileAt(x, y).index <= 199) {
                if (Math.floor(Math.random() * 100) == 1 && properties.outside > 0) {
                    properties.outside--;
                    // console.log("Spawned, outdoor interferences left to place: " + properties.outside);
                    mapObjects[objectLen] = {
                        id: 292,
                        name: "External Network",
                        properties: [{
                            name: "identified",
                            type: "bool",
                            value: false
                        }],
                        rotation: 0,
                        type: "Interference",
                        visible: true,
                        height: 309.666666666667,
                        width: 65.6666666666667,
                        x: x * 32,
                        y: y * 32
                    };

                    objectLen++;
                }
            }

            if (below.getTileAt(x, y).index >= 606 && below.getTileAt(x, y).index <= 608 ||
                below.getTileAt(x, y).index >= 490 && below.getTileAt(x, y).index <= 492 ||
                below.getTileAt(x, y).index >= 361 && below.getTileAt(x, y).index <= 367 ||
                below.getTileAt(x, y).index >= 385 && below.getTileAt(x, y).index <= 391
            ) {
                if (Math.floor(Math.random() * 300) == 1 && properties.indoor > 0) {
                    properties.indoor--;
                    //console.log("Spawned, indoor interferences left to place: " + properties.indoor);
                    switch (Math.floor(Math.random() * 2)) {
                        case 0:

                            mapObjects[objectLen] = {
                                id: 293,
                                name: "Radio Device",
                                properties: [{
                                    name: "identified",
                                    type: "bool",
                                    value: false
                                }],
                                rotation: 0,
                                type: "Interference",
                                visible: true,
                                height: 32.125,
                                width: 32.5,
                                x: x * 32,
                                y: y * 32
                            };
                            objectLen++;
                            world.putTileAt(661, x, y);
                            break;
                        case 1:

                            mapObjects[objectLen] = {
                                id: 283,
                                name: "Microwave",
                                properties: [{
                                    name: "identified",
                                    type: "bool",
                                    value: false
                                }],
                                rotation: 0,
                                type: "Interference",
                                visible: true,
                                height: 31.9547979797978,
                                width: 32.0507575757575,
                                x: x * 32,
                                y: y * 32
                            };
                            objectLen++;
                            world.putTileAt(493, x, y);
                            break;
                        case 2:

                            mapObjects[objectLen] = {
                                id: 291,
                                name: "Elevator Motor",
                                properties: [{
                                    name: "identified",
                                    type: "bool",
                                    value: false
                                }],
                                rotation: 0,
                                type: "Interference",
                                visible: true,
                                height: 29.6666666666666,
                                width: 32.6666666666666,
                                x: x * 32,
                                y: y * 32
                            };
                            objectLen++;
                            break;
                    }



                }
            }
        }
    }
    //console.log(mapObjects);
    return mapObjects;
}

/**
 * phase 1 scene with score for found interference objects
 * and decreasing score for clicks on non-interference objects
 */
class Phase1MenuScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'phase1menu-scene',
            active: true,

        })
        this.score = 0;
        this.interferenceObjectsFound = 0;
        this.toggle = false;

        this.angle = 0;
        this.offset = game.config.width * 0.2;
        this.speed = 0.15;

        this.points = [];

        this.graphics;
        this.iterator = 0;

        this.confirmPhaseButton;
        this.confirmPhaseText;
    }


    init(data) {
        //setup constructor properties based on localstorage
    }

    preload() {

    }

    getDistance(playerX, playerY, elementX, elementY) {

        // Inversing the equation gives us that fading effect when moving away from interference.
        this.speed = 200 / Phaser.Math.Distance.Between(playerX, playerY, elementX, elementY);
    }

    confirmPhase2() {
        //show the confirmation menu 
        this.confirmPhaseText.visible = true;
        this.confirmPhaseButton.visible = true;

    }

    setUpPhase2Menu() {
        this.scene.start('phase2menu-scene', {
            score: this.score,
            interferenceObjectsFound: this.interferenceObjectsFound,
            currentGamePhase: 2
        });

        //remove toggle event listener
        this.events.off('toggleMenu', this);
    }

    create() {
        //  Grab a reference to the Game Scene
        let ourGame = this.scene.manager.scenes[0];

        this.graphics = this.add.graphics();
        this.graphics.lineStyle(1, 0x2266aa);

        //  Our Text object to display the Score
        let info = this.add.text(10, 550, `\n\n\n\nScore : ${ this.score} \nInterference Objects Found : ${ this.interferenceObjectsFound}`, {
            font: '24px Arial',
            fill: '#000000'
        }).setInteractive();

        this.graphics.depth = 100;
        info.depth = 100;

        //menu background
        this.add.rectangle(150, 700, 410, 258, 0x000000);
        this.add.rectangle(150, 700, 400, 248, 0xFFFFFF);

        //button to go to the next phase
        var nextPhaseButton = this.add.rectangle(150, 750, 100, 25, 0xFFFFFF).setInteractive();
        nextPhaseButton.setStrokeStyle(3, 0x000000, 1);
        nextPhaseButton.depth = 99;
        //text for the next phase button
        let nextPhaseText = this.add.text(110, 740, `Next Phase`, {
            font: '16px Arial',
            fill: '#000000'
        });
        nextPhaseText.depth = 100;

        //confirm button to show if the next phase button is clikced
        this.confirmPhaseButton = this.add.rectangle(this.game.config.width / 2 + 57, this.game.config.height / 2 + 10.2, 140, 35, 0xFFFFFF).setInteractive();
        this.confirmPhaseButton.setStrokeStyle(3, 0x000000, 1);
        this.confirmPhaseButton.depth = 99;
        this.confirmPhaseButton.visible = false;

        //text for the confirm button
        this.confirmPhaseText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, `Click to confirm`, {
            font: '16px Arial',
            fill: '#000000'
        });
        this.confirmPhaseText.depth = 100;
        this.confirmPhaseText.visible = false;

        //events
        nextPhaseButton.on('pointerup', () => {
            confirmPhase(this);
        }, this);
        this.confirmPhaseButton.on('pointerup', () => {
            this.setUpPhase2Menu();
        }, this);

        //  Listen for events from it
        ourGame.events.on('addScore', function () {
            this.score += 1000;
            this.interferenceObjectsFound++;
            info.setText(`\n\n\n\nScore : ${ this.score} \nInterference Objects Found : ${ this.interferenceObjectsFound}`);
        }, this);

        //  Listen for events from it
        ourGame.events.on('subtractScore', function () {
            this.score -= this.score <= 0 ? 0 : 10;
            info.setText(`\n\n\n\nScore : ${ this.score} \nInterference Objects Found : ${ this.interferenceObjectsFound}`);

        }, this);

        //open close menu
        ourGame.events.on('toggleMenu', () => {
            toggleMenu(this);
        }, this);
        ourGame.events.on('grabDistance', this.getDistance, this);

    }

    update(time, delta) {

        //if menu is open run animation
        if (!this.toggle) {

            var y = (10 * this.speed) * Math.sin(this.angle) + 600;
            this.points[this.iterator] = new Phaser.Geom.Point(4.5 * this.iterator, y);
            if (this.iterator >= 1) {
                this.graphics.lineBetween(
                    this.points[this.iterator - 1].x,
                    this.points[this.iterator - 1].y,
                    this.points[this.iterator].x,
                    this.points[this.iterator].y
                );
            }
            if (this.iterator >= 80) {
                this.iterator = 0;
                this.angle = 0;
                this.graphics.clear();
            }
            this.iterator++;

            this.angle += this.speed;
        }

    }
}


/**
 * phase 2 scene with score for placing ans
 * and decreasing score for clicks on non-interference objects
 */
class Phase2MenuScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'phase2menu-scene',
            active: false, 
        })
        this.score = 2000;
        this.interferenceObjectsFound = 0;
        this.toggle = false;
 
        this.addAntennaBtn;
        this.antennaCount = 0;
        this.confirmPhaseButton;
        this.confirmPhaseText;
    }

    init(data) {
        this.score = data.score;
        this.interferenceObjectsFound = data.interferenceObjectsFound;

    }

    preload() {

    }


    create() {
        //  Grab a reference to the Game Scene
        let ourGame = this.scene.manager.scenes[0];

        this.graphics = this.add.graphics();
        this.graphics.lineStyle(1, 0x2266aa);

        //  Our Text object to display the Score
        let info = this.add.text(10, 650, `Coverage Score :% ${ this.score} \nAntennas placed : ${ this.antennaCount}`, {
            font: '24px Arial',
            fill: '#000000'
        }).setInteractive();

        this.graphics.depth = 100;
        info.depth = 100;

        var nextPhaseButton = this.add.rectangle(170, 750, 80, 25, 0xFFFFFF).setInteractive();
        nextPhaseButton.setStrokeStyle(3, 0x000000, 1);
        nextPhaseButton.depth = 99;
        let nextPhaseText = this.add.text(140, 740, `Submit`, {
            font: '16px Arial',
            fill: '#000000'
        });
        nextPhaseText.depth = 100;

        this.confirmPhaseButton = this.add.rectangle(this.game.config.width / 2 + 37, this.game.config.height / 2 + 10.2, 100, 35, 0xFFFFFF).setInteractive();
        this.confirmPhaseButton.setStrokeStyle(3, 0x000000, 1);
        this.confirmPhaseButton.depth = 99;
        this.confirmPhaseButton.visible = false;

        this.confirmPhaseText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, `End Game`, {
            font: '16px Arial',
            fill: '#000000'
        });
        this.confirmPhaseText.depth = 100;
        this.confirmPhaseText.visible = false;

        //menu background
        this.add.rectangle(150, 700, 410, 258, 0x000000);
        this.add.rectangle(150, 700, 400, 248, 0xFFFFFF);
        this.addAntennaBtn = this.add.rectangle(80, 615, 30, 30, 0x0dc040).setInteractive();
        this.removeAntennaBtn = this.add.rectangle(160, 615, 30, 30, 0xdd1010).setInteractive();

        this.toggleInterferenceZonesBtn = this.add.rectangle(240, 615, 30, 30, 0x1210CD).setInteractive();


        this.addAntennaBtn.on('pointerup', function () {
            this.events.emit('createAntenna');

        }, this)

        this.removeAntennaBtn.on('pointerup', function () {
            this.events.emit('deleteAntenna');

        }, this)

        this.toggleInterferenceZonesBtn.on('pointerup', function () {
            this.events.emit('toggleInterferenceZones');

        }, this)

        nextPhaseButton.on('pointerup', () => {
            confirmPhase(this);
        }, this);
        this.confirmPhaseButton.on('pointerup',function(){ this.endGame(this.game)}, this);

        //open close menu if phase2 
        ourGame.events.on('toggleMenu', () => {
            toggleMenu(this)
        }, this);
 
        ourGame.events.on('antennaCount', (score,antennaCount ) => {
            this.antennaCount =antennaCount;
            this.score = (score * 100).toFixed(2);

            info.setText(`Coverage Score :% ${ this.score} \nAntennas placed : ${ this.antennaCount}`);
        }, this);

        ourGame.events.on('coverageScore', (s) => {
            this.score = (s * 100).toFixed(2);
            info.setText(`Coverage Score :% ${ this.score} \nAntennas placed : ${ this.antennaCount}`);
        }, this);
    }

    update(time, delta) {


    }

    endGame(scene) {
        //implement endgame
        console.log('rip thanos');
        this.events.emit('prepareFinalScreenShot');
        this.confirmPhaseText.visible = false;
        this.confirmPhaseButton.visible = false;

        console.log(scene);
        scene.scene.scenes[0].cameras.add(-150, -250, 1480, 1480)
        .setName("mini")
        .setBackgroundColor(0x666666)
        // .setScroll(0.9 * 960, 0.9 * 960) // looks right!
        .setZoom(0.6);

        game.renderer.snapshot(function (image) {
            image.style.width = '1280px';
            image.style.height = '1280px';
            image.style.paddingLeft = '2px';
            snapHistory.push(image);
            console.log('snap!');
            document.body.appendChild(image);
        });

    } 

}


function toggleMenu(scene) {
    scene.toggle = !scene.toggle;
    if (scene.toggle) {
        scene.scene.sendToBack();
    } else {
        scene.scene.bringToTop()
        scene.confirmPhaseText.visible = false;
        scene.confirmPhaseButton.visible = false;
    }
}

function confirmPhase(scene) {
    //show the confirmation menu
    scene.confirmPhaseText.visible = true;
    scene.confirmPhaseButton.visible = true;

}


var snapHistory = [];
 
const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 800,
    parent: "game-container",
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 0
            }
        }
    },
    scene: [GameScene,
        Phase1MenuScene,
        Phase2MenuScene
    ]
};
const game = new Phaser.Game(config);

