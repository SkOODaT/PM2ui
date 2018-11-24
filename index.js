var http = require('http');
var pm2 = require('pm2');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.set('view engine', 'html');
app.use(bodyParser());
//app.use(express.static(__dirname + '/View'));
//app.use(express.static(__dirname + '/Script'));

var port = 8080;

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
});

app.get('/test', function(req, res) {
    //res.sendFile(__dirname + '/index.html');
    //res.render('index', instances, function(err, html) {});
	
	var html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
	<!-- Latest compiled and minified CSS -->
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
	<!-- Optional theme -->
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
	<!-- Latest compiled and minified JavaScript -->
	<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  </head>
  <div class="table-responsive">
    <table class="table">
	  <thead>
		<th scope="col">Name</th>
		  <th scope="col">PID</th>
		  <th scope="col">CPU</th>
		  <th scope="col">Memory</th>
		  <th scope="col">Uptime</th>
		  <th scope="col">Status</th>
		</thead>
	  <tbody>`;
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }

        var instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                uptime:x.pm2_env.pm_uptime,
                status:x.pm2_env.status
            };
        });
		
		instances.forEach(function(element) {
			html += `
			<tr>
			  <th scope="row">` + element.name + `</th>
			  <th>` + element.pid + `</th>
			  <th>` + element.cpu + `%</th>
			  <th>` + (element.mem / 1024) + `KB</th>
			  <th>` + element.uptime + `</th>
			  <th class="` + (element.status === "online" ? "success" : "danger") + `">` + element.status + `</th>
			  <th>
			    <div class="btn-group" role="group" aria-label="...">
				  <a class="btn btn-success btn-default" href="/start/` + element.name + `" role="button">Start</a>
				  <a class="btn btn-danger btn-default" href="/stop/` + element.name + `" role="button">Stop</a>
				  <a class="btn btn-primary btn-default" href="/restart/` + element.name + `" role="button">Restart</a>
				</div>
			  </th>
			</tr>`;
		});
		
		html += `</tbody>
	</table>
  </div>
</html>`;
		res.write(html);
		res.end();
    });
});

app.post('/submit', function(req, res) {
    var body = req.body;
    console.log(body);

	var baseUrl = req.protocol + "://" + req.hostname + ":" + port;
	var url = baseUrl;
    if (body.hasOwnProperty('start')) {
        url += "/start/" + body.instance;
    } else if (body.hasOwnProperty('stop')) {
        url += "/stop/" + body.instance;
    } else if (body.hasOwnProperty('restart')) {
        url += "/restart/" + body.instance;
    } else {
        res.write("error");
        res.end();
    }
	
	http.get(url, function(resp) {
		var data = '';
		resp.on('data', function(chunk) {
			data += chunk;
		});
		
		resp.on('end', function() {
			console.log(data);
			res.write(data);
			res.end();
		});
	}).on('error', function(err) {
		console.log("Error:", err.message);
	});
});

app.get('/list', function(req, res) {
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }

        var instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                uptime:x.pm2_env.pm_uptime,
                status:x.pm2_env.status
            };
        });
		//TODO: Write table with control buttons
        res.write(JSON.stringify(instances));
        res.end();
    });
});

app.get('/start/:name', function(req, res) {
    console.log("Attempting to start", req.params.name);
    pm2.start(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "started successfully.");
            res.write("OK");
        }
              
        res.end();
    });
});

app.get('/stop/:name', function(req, res) {
    console.log("Attempting to stop", req.params.name);
    pm2.stop(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "stopped successfully.");
            res.write("OK");
        }
        
        res.end();
    });
});

app.get('/restart/:name', function(req, res) {
    console.log("Attempting to restart", req.params.name);
    pm2.restart(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "stopped successfully.");
            res.write("OK");
        }
        
        res.end();
    });
});

var server = app.listen(port, function() {
    var host = server.address().address;
    console.log("Listening on http://%s:%s", host, port);
});